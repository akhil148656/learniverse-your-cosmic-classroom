// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bump this string whenever you redeploy, to confirm you're hitting the latest code.
const DEPLOY_MARK = "smart-learning-suggestions-v4-subject-aware";

type SuggestionTopic = {
  title: string;
  hook: string;
  query: string;
  minutes?: number;
};

type ResponseBody = {
  deployMark: string;
  provider: "groq" | "gemini";
  model: string;
  topics: SuggestionTopic[];
  diagnostics?: Record<string, unknown>;
};

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractFirstJsonObject(raw: string): string {
  // Grok is usually good about JSON-only, but defensively extract the first {...} block.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw;
}

function normalizeGeminiModel(input: string): string {
  const raw = (input || "").trim();
  const withoutPrefix = raw.replace(/^models\//i, "");
  switch (withoutPrefix) {
    case "gemini-1.5-flash-001":
      return "gemini-1.5-flash";
    case "gemini-1.5-pro-001":
      return "gemini-1.5-pro";
    default:
      return withoutPrefix || "gemini-2.0-flash";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const gradeLevel = Number(body?.gradeLevel ?? body?.grade_level ?? 8);
    const preferredLanguage = typeof body?.preferredLanguage === "string" ? body.preferredLanguage : null;
    const className = typeof body?.className === "string" ? body.className : null;
    const classDescription = typeof body?.classDescription === "string" ? body.classDescription : null;
    const primarySubject = typeof body?.primarySubject === "string" ? body.primarySubject : null;
    const subjects = Array.isArray(body?.subjects) ? body.subjects : [];
    const recentTopics = Array.isArray(body?.recentTopics) ? body.recentTopics : [];
    const upcomingAssignments = Array.isArray(body?.upcomingAssignments) ? body.upcomingAssignments : [];

    // Providers (no xAI): Groq first, then Gemini fallback.
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_MODEL = (Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant").trim();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = normalizeGeminiModel(Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash");

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "AI not configured. Add GROQ_API_KEY (recommended) or GEMINI_API_KEY to Edge Function secrets.",
          deployMark: DEPLOY_MARK,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeGrade = Number.isFinite(gradeLevel) ? Math.max(6, Math.min(12, gradeLevel)) : 8;

    const nonce = crypto.randomUUID();

    const assignmentsBlock = (upcomingAssignments || [])
      .slice(0, 6)
      .map((a: any) => {
        const title = typeof a?.title === "string" ? a.title : "";
        const due = typeof a?.due_date === "string" ? a.due_date : null;
        return `- ${title}${due ? ` (due ${due})` : ""}`.trim();
      })
      .filter(Boolean)
      .join("\n");

    const recentTopicsBlock = (recentTopics || [])
      .slice(0, 8)
      .map((t: any) => (typeof t === "string" ? t : ""))
      .filter(Boolean)
      .join("\n");

    const languageLine = preferredLanguage ? `Preferred language tag: ${preferredLanguage}` : "";
    const classLine = className ? `Student's class: ${className}` : "";
    const classDescLine = classDescription ? `Class description: ${classDescription}` : "";
    const subjectLine = primarySubject ? `Primary subject focus: ${primarySubject}` : "";
    const subjectsLine = (subjects || [])
      .map((s: any) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean)
      .slice(0, 6)
      .join(", ");

    const prompt = `You are Learniverse's learning coach.

Goal: Generate exciting, curiosity-driven learning topic suggestions for a student in grade ${safeGrade}.
The suggestions should make the student WANT to click and learn.

Constraints:
- Must be age-appropriate and aligned to grade ${safeGrade}.
- Focus on STEM + real-world curiosity (science, math, tech), but keep variety.
- If a class subject is provided, prioritize it.
- Do NOT include any harmful content.
- Avoid topics already recently suggested/learned.
- Return STRICT JSON only.

Context (optional):
${languageLine}
${classLine}
${classDescLine}
${subjectLine}
${subjectsLine ? `Other class subjects: ${subjectsLine}` : ""}

Upcoming assignments (use these to recommend helpful prep topics):
${assignmentsBlock || "(none)"}

Recently learned/suggested topics (avoid repeating):
${recentTopicsBlock || "(unknown)"}

Nonce (for variety; do not include in output): ${nonce}

Return JSON object with exactly this shape:
{
  "topics": [
    {
      "title": "short catchy title",
      "hook": "1 sentence hook that creates interest",
      "query": "search query string suitable for Learn/Search",
      "minutes": 10
    }
  ]
}

Generate 6 topics.

If Primary subject focus is present:
- Make topics 1-3 directly support that subject.
- Topics 4-6 can be interdisciplinary but still relevant to the class or upcoming assignments.`;

    const systemMsg =
      "You generate learning recommendations for students. Output must be valid JSON only, with no markdown and no extra commentary.";

    const attemptErrors: Array<{ provider: string; status?: number; message: string }> = [];

    const generateViaGroq = async () => {
      if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: prompt },
          ],
          temperature: 0.85,
          top_p: 0.95,
          presence_penalty: 0.6,
          frequency_penalty: 0.2,
          max_tokens: 900,
          stream: false,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        const parsed = safeJsonParse<any>(text);
        const msg = String(parsed?.error?.message || parsed?.message || text || "Request failed")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);
        const err: any = new Error(msg);
        err.status = response.status;
        throw err;
      }

      const data = safeJsonParse<any>(text) || {};
      const content = String(data?.choices?.[0]?.message?.content ?? "{}");
      return { provider: "groq" as const, model: GROQ_MODEL, content };
    };

    const generateViaGemini = async () => {
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL
      )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemMsg }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            topP: 0.9,
            maxOutputTokens: 900,
          },
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        const parsed = safeJsonParse<any>(text);
        const msg = String(parsed?.error?.message || parsed?.message || text || "Request failed")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);
        const err: any = new Error(msg);
        err.status = response.status;
        throw err;
      }

      const data = safeJsonParse<any>(text) || {};
      const content =
        String(
          data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p?.text)
            .filter(Boolean)
            .join("\n") || "{}"
        );
      return { provider: "gemini" as const, model: GEMINI_MODEL, content };
    };

    const generators = [generateViaGroq, generateViaGemini];
    let chosen: any = null;
    for (const gen of generators) {
      try {
        chosen = await gen();
        break;
      } catch (err: any) {
        attemptErrors.push({
          provider: gen.name.replace(/^generateVia/i, "").toLowerCase(),
          status: typeof err?.status === "number" ? err.status : undefined,
          message: String(err?.message || "Failed"),
        });
      }
    }

    if (!chosen) {
      throw new Error(
        `All AI providers failed: ${attemptErrors
          .map((e) => `${e.provider}${e.status ? `(${e.status})` : ""}: ${e.message}`)
          .join(" | ")}`
      );
    }

    const extracted = extractFirstJsonObject(String(chosen.content || "{}"));
    const parsed = safeJsonParse<{ topics?: SuggestionTopic[] }>(extracted) || {};

    const topics = Array.isArray(parsed.topics)
      ? parsed.topics
          .filter((t) => t && typeof t.title === "string" && typeof t.hook === "string" && typeof t.query === "string")
          .slice(0, 8)
      : [];

    const resBody: ResponseBody = {
      deployMark: DEPLOY_MARK,
      provider: chosen.provider,
      model: chosen.model,
      topics,
      diagnostics: {
        attempted: attemptErrors,
        gradeLevel: safeGrade,
      },
    };

    return new Response(JSON.stringify(resBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: e?.message || "Failed to generate suggestions",
        deployMark: DEPLOY_MARK,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
