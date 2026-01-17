// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bump this string whenever you redeploy, to confirm you're hitting the latest code.
const DEPLOY_MARK = "generate-feedback-v2-model";

function normalizeGeminiModel(input: string): string {
  const raw = (input || "").trim();
  const withoutPrefix = raw.replace(/^models\//i, "");
  switch (withoutPrefix) {
    case "gemini-1.5-flash-001":
      return "gemini-1.5-flash";
    case "gemini-1.5-pro-001":
      return "gemini-1.5-pro";
    default:
      return withoutPrefix;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_MODEL = (Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant").trim();
    const GEMINI_MODEL_RAW = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
    const GEMINI_MODEL = normalizeGeminiModel(GEMINI_MODEL_RAW);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const diagnostics = {
      deployMark: DEPLOY_MARK,
      hasGroqKey: Boolean(GROQ_API_KEY),
      groqModel: GROQ_MODEL,
      hasGeminiKey: Boolean(GEMINI_API_KEY),
      geminiModel: GEMINI_MODEL,
      geminiModelRaw: GEMINI_MODEL_RAW,
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      hasStudentId: Boolean(studentId),
    };

    const provider = GROQ_API_KEY ? "groq" : "gemini";
    const model = GROQ_API_KEY ? GROQ_MODEL : GEMINI_MODEL;

    console.log("generate-feedback diagnostics:", diagnostics);

    if (!studentId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: studentId", provider, model, diagnostics }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Edge Function secrets.",
          provider,
          model,
          diagnostics,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      console.error("No AI API key configured (GROQ_API_KEY/GEMINI_API_KEY missing)");
      return new Response(
        JSON.stringify({
          error:
            "AI not configured. Add GROQ_API_KEY (Groq) or GEMINI_API_KEY (Google AI Studio) to Supabase Edge Function secrets.",
          provider: null,
          model: null,
          diagnostics,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get student performance summary
    const { data: performanceData, error: perfError } = await supabase
      .rpc("get_student_performance_summary", { student_uuid: studentId });

    if (perfError) {
      console.error("Error fetching performance:", perfError);
      throw new Error("Failed to fetch student performance");
    }

    const performance = performanceData?.[0] || {
      student_name: "Student",
      total_xp: 0,
      focus_score: 100,
      topics_completed: 0,
      quizzes_attempted: 0,
      quizzes_passed: 0,
      average_score: 0,
      study_time_minutes: 0,
      recent_quiz_attempts: [],
    };

    console.log("Generating AI feedback for student:", performance.student_name);

    const recentAttemptsText = (() => {
      try {
        return JSON.stringify(performance.recent_quiz_attempts ?? [], null, 2);
      } catch {
        return "[]";
      }
    })();

    const prompt = `Analyze the following student performance data and provide personalized feedback for their parents and teachers.

Student: ${performance.student_name}
Total XP: ${performance.total_xp}
Focus Score: ${performance.focus_score}%
Topics Completed: ${performance.topics_completed}
Quizzes Attempted: ${performance.quizzes_attempted}
Quizzes Passed: ${performance.quizzes_passed}
Average Score: ${performance.average_score}%
Total Study Time: ${performance.study_time_minutes} minutes

Recent Quiz Attempts (latest 5, includes score %, accuracy %, and time_taken_seconds):
${recentAttemptsText}

Provide:
1. A brief summary of the student's learning progress
2. Strengths identified from the data
3. Areas for improvement
4. Specific recommendations for parents to help their child
5. Suggestions for the teacher

When assessing performance, explicitly consider BOTH marks scored (score/accuracy) AND time spent (study time + time_taken_seconds from recent quizzes). Highlight patterns like rushing (very low time) or struggling (low score despite high time).

Keep the feedback encouraging, constructive, and actionable. Format as a clear, parent-friendly report.`;

    const systemInstruction =
      "You are an AI educational analyst for Learniverse. Provide insightful, encouraging, and actionable feedback about student performance. Be specific and constructive.";

    const generateViaGroq = async () => {
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const body = {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 1024,
        stream: false,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let extracted = "";
        try {
          const parsed = JSON.parse(errorText);
          extracted = parsed?.error?.message || parsed?.message || "";
        } catch {
          extracted = errorText;
        }
        const msg = String(extracted || "").replace(/\s+/g, " ").trim().slice(0, 400);
        console.error("Groq API error:", response.status, errorText);
        throw new Error(`Groq API error (${response.status}): ${msg || "Request failed"}`);
      }

      const data = await response.json();
      const feedbackText = data?.choices?.[0]?.message?.content ?? "";
      return { ok: true as const, feedbackText };
    };

    const generateViaGemini = async () => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL
      )}:generateContent?key=${encodeURIComponent(
        GEMINI_API_KEY ?? ""
      )}`;

      const body = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1024,
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let extracted = "";
        try {
          const parsed = JSON.parse(errorText);
          extracted = parsed?.error?.message || parsed?.message || "";
        } catch {
          extracted = errorText;
        }
        const msg = String(extracted || "").replace(/\s+/g, " ").trim().slice(0, 400);
        console.error("Gemini API error:", response.status, errorText);
        if (response.status === 404) {
          throw new Error(
            `Gemini API error (404): ${msg || "Model not found"}. Set GEMINI_MODEL to a supported model (e.g. gemini-2.0-flash).`
          );
        }
        if (response.status === 429) {
          throw new Error(
            `Gemini API quota exceeded (429): ${msg || "Rate/usage limit"}. Check Google AI Studio / Cloud billing & quota for this API key.`
          );
        }
        throw new Error(`Gemini API error (${response.status}): ${msg || "Request failed"}`);
      }

      const data = await response.json();
      type GeminiPart = { text?: string };
      const parts = (data?.candidates?.[0]?.content?.parts ?? []) as GeminiPart[];
      const feedbackText = parts
        .map((p) => p.text)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
        .join("");
      return { ok: true as const, feedbackText };
    };

    const generation = GROQ_API_KEY ? await generateViaGroq() : await generateViaGemini();

    if (generation instanceof Response) {
      return generation;
    }

    const isOk = (
      value: unknown
    ): value is {
      ok: true;
      feedbackText: string;
    } => {
      if (typeof value !== "object" || value === null) return false;
      const record = value as Record<string, unknown>;
      return record.ok === true && typeof record.feedbackText === "string";
    };

    if (!isOk(generation)) {
      throw new Error("AI service unavailable");
    }

    const feedbackText = generation.feedbackText || "Unable to generate feedback at this time.";

    // Determine category based on performance
    let category = "progress";
    if (performance.focus_score < 70) category = "focus";
    else if (performance.average_score < 60) category = "improvement";
    else if (performance.quizzes_passed > 5 && performance.average_score > 80) category = "achievement";

    // Save feedback to database
    const { data: savedFeedback, error: saveError } = await supabase
      .from("ai_feedback")
      .insert({
        student_id: studentId,
        feedback_text: feedbackText,
        category: category,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving feedback:", saveError);
    }

    return new Response(JSON.stringify({ 
      feedback: feedbackText, 
      category,
      saved: !saveError,
      performance,
      provider,
      model,
      diagnostics,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate feedback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = /\(429\)|quota exceeded/i.test(message)
      ? 429
      : /\(404\)|model not found|not found for API version/i.test(message)
        ? 404
        : 500;
    return new Response(
      JSON.stringify({
        error: message,
        deployMark: DEPLOY_MARK,
      }),
      {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
