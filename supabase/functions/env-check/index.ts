// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bump this string whenever you redeploy, to confirm you're hitting the latest code.
const DEPLOY_MARK = "env-check-v2-model";

function normalizeGeminiModel(model: string): string {
  switch ((model || "").trim()) {
    case "gemini-1.5-flash-001":
      return "gemini-1.5-flash";
    case "gemini-1.5-pro-001":
      return "gemini-1.5-pro";
    default:
      return (model || "").trim();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const env = Deno.env.toObject();
    const gemRelatedEnvNames = Object.keys(env)
      .filter((k) => k.toUpperCase().includes("GEM") || k.toUpperCase().includes("LOV"))
      .sort();

    const gemini = Deno.env.get("GEMINI_API_KEY");
    const geminiModelRaw = Deno.env.get("GEMINI_MODEL") || "";
    const geminiModelNormalized = geminiModelRaw
      ? normalizeGeminiModel(geminiModelRaw)
      : "";
    const lovable = Deno.env.get("LOVABLE_API_KEY");
    const openai = Deno.env.get("OPENAI_API_KEY");
    const groq = Deno.env.get("GROQ_API_KEY");
    const groqModel = (Deno.env.get("GROQ_MODEL") || "").trim();
    const youtube = Deno.env.get("YOUTUBE_API_KEY");

    const diagnostics = {
      deployMark: DEPLOY_MARK,
      hasGeminiKey: Boolean(gemini),
      geminiKeyLength: gemini?.length ?? 0,
      hasGeminiModel: Boolean(geminiModelRaw),
      geminiModelRaw: geminiModelRaw || null,
      geminiModelNormalized: geminiModelNormalized || null,
      hasLovableKey: Boolean(lovable),
      lovableKeyLength: lovable?.length ?? 0,
      hasSupabaseUrl: Boolean(Deno.env.get("SUPABASE_URL")),
      hasAnonKey: Boolean(Deno.env.get("SUPABASE_ANON_KEY")),
      hasServiceRoleKey: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
      hasOpenAIKey: Boolean(openai),
      openaiKeyLength: openai?.length ?? 0,
      hasGroqKey: Boolean(groq),
      groqKeyLength: groq?.length ?? 0,
      groqModel: groqModel || null,
      hasYouTubeKey: Boolean(youtube),
      youtubeKeyLength: youtube?.length ?? 0,
      gemRelatedEnvNames,
    };

    return new Response(JSON.stringify(diagnostics), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
