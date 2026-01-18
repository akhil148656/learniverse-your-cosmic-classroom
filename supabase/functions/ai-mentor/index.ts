// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bump this string whenever you redeploy, to confirm you're hitting the latest code.
const DEPLOY_MARK = "ai-mentor-v3-attachments";

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function limitToLines(raw: string, maxLines: number): string {
  const normalized = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length >= maxLines) return lines.slice(0, maxLines).join("\n");

  // If the model didn't include line breaks, fall back to sentence-ish splitting.
  if (lines.length <= 1) {
    const parts = normalized
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length > 1) return parts.slice(0, maxLines).join("\n");
  }

  return lines.join("\n");
}

function normalizeGeminiModel(input: string): string {
  const raw = (input || "").trim();
  const withoutPrefix = raw.replace(/^models\//i, "");
  // Google has changed/rotated some revisioned model ids over time.
  // Keep this normalization resilient by mapping older revisioned ids to stable ids.
  switch (withoutPrefix) {
    case "gemini-1.5-flash-001":
      return "gemini-1.5-flash";
    case "gemini-1.5-pro-001":
      return "gemini-1.5-pro";
    default:
      return withoutPrefix;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type, maxLines, attachment } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    const GROQ_MODEL = (Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant").trim();

    const GEMINI_MODEL_RAW = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
    const GEMINI_MODEL = normalizeGeminiModel(GEMINI_MODEL_RAW);

    const diagnostics = {
      deployMark: DEPLOY_MARK,
      hasGroqKey: Boolean(GROQ_API_KEY),
      groqModel: GROQ_MODEL,
      hasGeminiKey: Boolean(GEMINI_API_KEY),
      hasMessages: Array.isArray(messages),
      messageCount: Array.isArray(messages) ? messages.length : 0,
      type,
      geminiModel: GEMINI_MODEL,
      geminiModelRaw: GEMINI_MODEL_RAW,
      hasAttachment: Boolean(attachment),
      attachmentKind: attachment?.kind,
    };

    console.log("ai-mentor diagnostics:", diagnostics);

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing required field: messages (array)", diagnostics }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      console.error("No AI API key configured (GROQ_API_KEY/GEMINI_API_KEY missing)");
      return new Response(
        JSON.stringify({
          error:
            "AI not configured. Add GROQ_API_KEY (Groq) or GEMINI_API_KEY (Google AI Studio) to Supabase Edge Function secrets.",
          diagnostics,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const safeType = type === "notes" || type === "quiz" ? type : "chat";
    const lineLimit = safeType === "quiz" ? null : clampInt(maxLines, 3, 1, 6);

    console.log(`AI request - type: ${safeType}, messages: ${messages.length}, maxLines: ${lineLimit ?? "none"}`);

    let systemPrompt = `You are an AI learning mentor for Learniverse, an educational platform for students in grades 6-12. 
    You help students understand complex topics, answer questions, and provide encouragement.
    Keep your responses clear, engaging, and age-appropriate.
    Use examples and analogies to explain difficult concepts.
    Always encourage curiosity and learning.`;

    if (safeType === "notes") {
      systemPrompt = `You are an AI tutor for Learniverse.
      Explain the topic simply for grades 6-12.
      Output MUST be concise and helpful.`;
    } else if (safeType === "quiz") {
      systemPrompt = `You are a quiz generator for Learniverse. Create educational quiz questions on the given topic.
      Return a JSON array with exactly 5 questions in this format:
      [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}]
      where "correct" is the index of the correct answer (0-3).
      Make questions progressively harder.
      Include explanations for learning.`;
    }

    if (lineLimit) {
      systemPrompt += `\n\nHard rule: respond in at most ${lineLimit} short lines. No extra paragraphs.`;
    }

    // Groq (OpenAI-compatible). We request a single completion, then we stream it to the client in OpenAI-ish SSE chunks.
    const callGroq = async (promptMessages: Array<{ role: "user" | "assistant"; content: string }>) => {
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const body = {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...promptMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: lineLimit ? 160 : 1024,
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
      const text = data?.choices?.[0]?.message?.content ?? "";
      return { raw: data, text: text || "" };
    };

    const parseDataUrlBase64 = (dataUrl: string) => {
      const raw = String(dataUrl || "");
      const match = raw.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return { mime: "application/octet-stream", base64: "" };
      return { mime: match[1], base64: match[2] };
    };

    // Gemini direct via Google AI Studio key (we simulate OpenAI-style streaming)
    const callGemini = async (
      promptMessages: Array<{ role: "user" | "assistant"; content: string }>,
      maybeAttachment?: any
    ) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL
      )}:generateContent?key=${encodeURIComponent(
        GEMINI_API_KEY ?? ""
      )}`;

      const wantsImage = maybeAttachment?.kind === "image" && typeof maybeAttachment?.dataUrl === "string";
      const imagePayload = wantsImage ? parseDataUrlBase64(maybeAttachment.dataUrl) : null;
      const imageMime = wantsImage ? String(maybeAttachment?.mime || imagePayload?.mime || "image/*") : null;
      const imageBase64 = wantsImage ? String(imagePayload?.base64 || "") : "";

      if (wantsImage && !imageBase64) {
        throw new Error("Invalid image attachment (missing base64 data URL)");
      }

      const contents = promptMessages.map((m, idx) => {
        const isLastUser = wantsImage && m.role === "user" && idx === promptMessages.length - 1;
        const baseParts: any[] = [{ text: String(m.content || "") }];

        if (isLastUser) {
          baseParts.push({ inline_data: { mime_type: imageMime, data: imageBase64 } });
        }

        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: baseParts,
        };
      });

      const body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: lineLimit ? 220 : 1024,
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
      const text = parts
        .map((p) => p.text)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
        .join("");

      return { raw: data, text: text || "" };
    };

    const wantsVision = attachment?.kind === "image";

    if (wantsVision && !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Image attachments require GEMINI_API_KEY to be set (Gemini multimodal). Please configure GEMINI_API_KEY in Supabase Edge Function secrets.",
          diagnostics,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const useGemini = wantsVision ? true : !GROQ_API_KEY;
    const callProvider = useGemini ? (m: any) => callGemini(m, attachment) : callGroq;
    const provider = useGemini ? "gemini" : "groq";
    const model = useGemini ? GEMINI_MODEL : GROQ_MODEL;

    if (safeType === "quiz") {
      const result = await callProvider(messages);
      // Return OpenAI-ish response shape (so any client expecting choices.message.content still works)
      return new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: result.text } }],
          provider,
          model,
          deployMark: DEPLOY_MARK,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await callProvider(messages);
    const encoder = new TextEncoder();
    const content = lineLimit ? limitToLines(result.text, lineLimit) : result.text;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const meta = JSON.stringify({
          provider,
          model,
          deployMark: DEPLOY_MARK,
          type: safeType,
        });
        controller.enqueue(encoder.encode(`data: ${meta}\n\n`));

        const chunkSize = 24;
        for (let i = 0; i < content.length; i += chunkSize) {
          const piece = content.slice(i, i + chunkSize);
          const payload = JSON.stringify({ choices: [{ delta: { content: piece } }] });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-AI-Provider": provider,
        "X-AI-Model": model,
        "X-Deploy-Mark": DEPLOY_MARK,
      },
    });
  } catch (error) {
    console.error("AI Mentor error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = /\(429\)|quota exceeded/i.test(message)
      ? 429
      : /\(404\)|model not found|not found for API version/i.test(message)
        ? 404
        : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
