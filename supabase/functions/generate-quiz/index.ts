// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bump this string whenever you redeploy, to confirm you're hitting the latest code.
const DEPLOY_MARK = "generate-quiz-v2-model";

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
    const { topic, difficulty, questionCount = 5, gradeLevel = 10, studentId } = await req.json();
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
      hasTopic: Boolean(topic),
      hasStudentId: Boolean(studentId),
    };

    const provider = GROQ_API_KEY ? "groq" : "gemini";
    const model = GROQ_API_KEY ? GROQ_MODEL : GEMINI_MODEL;

    const nonce = crypto.randomUUID();

    console.log("generate-quiz diagnostics:", diagnostics);

    if (!topic) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: topic",
          provider,
          model,
          diagnostics,
        }),
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

    console.log(`Generating quiz - topic: ${topic}, difficulty: ${difficulty}, questions: ${questionCount}, grade: ${gradeLevel}, studentId: ${studentId ? "yes" : "no"}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Adapt difficulty using student's recent quiz performance (if provided)
    let difficultyUsed = (difficulty || "medium").toString();
    let recentQuestionTexts: string[] = [];

    if (studentId) {
      try {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("quiz_id, score, accuracy, time_taken_seconds")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(10);

        const scores = (attempts || [])
          .map((a) => Number(a.score))
          .filter((n) => Number.isFinite(n));
        const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

        if (!difficulty || difficultyUsed === "auto") {
          if (avgScore !== null && avgScore >= 80) difficultyUsed = "hard";
          else if (avgScore !== null && avgScore < 60) difficultyUsed = "easy";
          else difficultyUsed = "medium";
        }

        const quizIds = Array.from(new Set((attempts || []).map((a) => a.quiz_id).filter(Boolean))) as string[];
        if (quizIds.length) {
          const { data: recentQuestions } = await supabase
            .from("quiz_questions")
            .select("question_text")
            .in("quiz_id", quizIds)
            .order("created_at", { ascending: false })
            .limit(20);
          recentQuestionTexts = (recentQuestions || [])
            .map((q) => (q as { question_text?: string }).question_text)
            .filter((t): t is string => typeof t === "string" && t.length > 0);
        }

        (diagnostics as any).avgRecentScore = avgScore !== null ? Math.round(avgScore * 100) / 100 : null;
      } catch (e) {
        console.warn("Could not adapt quiz difficulty from history", e);
      }
    }

    if (difficultyUsed === "auto") difficultyUsed = "medium";
    (diagnostics as any).difficultyRequested = difficulty || null;
    (diagnostics as any).difficultyUsed = difficultyUsed;
    (diagnostics as any).nonce = nonce;

    const recentBlock = recentQuestionTexts.length
      ? `\nAvoid repeating ANY of these recently asked questions (do not reuse wording):\n${recentQuestionTexts
        .slice(0, 20)
        .map((t) => `- ${t}`)
        .join("\n")}\n`
      : "";

    const difficultyDefinitions = {
      easy: "EASY level: Ask fundamental questions focusing on simple definitions, direct concepts, and straightforward recall. Options should be distinct and not tricky.",
      medium: "MEDIUM level: Intermediate conceptual questions, requiring application of theories and moderate reasoning.",
      hard: "HARD level: Advanced theoretical concepts, tricky multi-step calculations, complex scenario analysis, and plausible wrong answer choices (distractors) that require deep comprehension to differentiate."
    };
    const difficultyGuide = difficultyDefinitions[difficultyUsed as "easy" | "medium" | "hard"] || difficultyDefinitions.medium;

    const prompt = `Create a ${questionCount}-question multiple choice quiz on the topic "${topic}" for grade ${gradeLevel} students.
  
  DIFFICULTY LEVEL GUIDELINES (Strictly enforce this difficulty):
  ${difficultyGuide}

  Generate NEW, VARIED questions each time. Do NOT reuse questions from previous runs, even if the topic is the same.
  Use this nonce only to ensure variety (do not include it in the output): ${nonce}
  ${recentBlock}

Return ONLY a valid JSON array with no additional text. Each question object must have exactly these fields:
- "question": The question text
- "options": An array of exactly 4 answer choices (strings)
- "correct": The index (0-3) of the correct answer
- "explanation": A brief explanation of why the correct answer is right
- "points": Points for this question (10-30 based on difficulty)

Example format:
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correct": 1,
    "explanation": "Paris is the capital city of France.",
    "points": 10
  }
]

Make questions progressively harder. Ensure all questions are educational and age-appropriate.`;

    const generateViaGroq = async () => {
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const body = {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an educational quiz generator for Learniverse. Generate accurate, educational quiz questions. Return ONLY valid JSON arrays with no markdown or extra text.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        top_p: 0.95,
        presence_penalty: 0.6,
        frequency_penalty: 0.2,
        max_tokens: 2048,
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
      const content = data?.choices?.[0]?.message?.content ?? "[]";
      return { ok: true as const, content };
    };

    const generateViaGemini = async () => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL
      )}:generateContent?key=${encodeURIComponent(
        GEMINI_API_KEY ?? ""
      )}`;

      const body = {
        systemInstruction: {
          parts: [
            {
              text: "You are an educational quiz generator for Learniverse. Generate accurate, educational quiz questions. Return ONLY valid JSON arrays with no markdown or extra text.",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
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
      const content =
        parts
          .map((p) => p.text)
          .filter((t): t is string => typeof t === "string" && t.length > 0)
          .join("") || "[]";

      return { ok: true as const, content };
    };

    const generation = GROQ_API_KEY ? await generateViaGroq() : await generateViaGemini();

    if (generation instanceof Response) {
      return generation;
    }

    const isOk = (
      value: unknown
    ): value is {
      ok: true;
      content: string;
    } => {
      if (typeof value !== "object" || value === null) return false;
      const record = value as Record<string, unknown>;
      return record.ok === true && typeof record.content === "string";
    };

    if (!isOk(generation)) {
      throw new Error("AI service unavailable");
    }

    let content = generation.content || "[]";
    
    // Clean the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    type GeneratedQuestion = {
      question: string;
      options: string[];
      correct: number;
      explanation: string;
      points?: number;
    };

    let questions: GeneratedQuestion[];
    try {
      questions = JSON.parse(content) as GeneratedQuestion[];
    } catch (parseError) {
      console.error("Failed to parse quiz questions:", parseError, content);
      throw new Error("Failed to parse quiz questions");
    }

    // Save the quiz to database
    
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: `Quiz: ${topic}`,
        description: `AI-generated quiz on ${topic}`,
        difficulty_level: difficultyUsed === "easy" ? 1 : difficultyUsed === "hard" ? 3 : 2,
        time_limit_minutes: questionCount * 2,
      })
      .select()
      .single();

    if (quiz && !quizError) {
      // Save questions
      const questionsToInsert = questions.map((q: GeneratedQuestion) => ({
        quiz_id: quiz.id,
        question_text: q.question,
        options: q.options,
        correct_answer: q.options[q.correct],
        explanation: q.explanation,
        points: q.points || 10,
        question_type: "multiple_choice",
      }));

      await supabase.from("quiz_questions").insert(questionsToInsert);
    }

    return new Response(JSON.stringify({ 
      questions,
      quizId: quiz?.id,
      topic,
      difficulty: difficultyUsed,
      provider,
      model,
      diagnostics,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate quiz error:", error);
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
        provider: Deno.env.get("GROQ_API_KEY") ? "groq" : Deno.env.get("GEMINI_API_KEY") ? "gemini" : null,
      }),
      {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
