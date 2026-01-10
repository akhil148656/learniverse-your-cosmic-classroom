import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = `You are an AI learning mentor for Learniverse, an educational platform for students in grades 6-12. 
    You help students understand complex topics, answer questions, and provide encouragement.
    Keep your responses clear, engaging, and age-appropriate.
    Use examples and analogies to explain difficult concepts.
    Always encourage curiosity and learning.`;

    if (type === "notes") {
      systemPrompt = `You are an AI tutor for Learniverse. Generate comprehensive, easy-to-understand notes on the given topic.
      Structure your response with:
      - Clear headings and subheadings
      - Key concepts explained simply
      - Examples and real-world applications
      - Important formulas or definitions (if applicable)
      - Summary points at the end
      Use markdown formatting for better readability.
      Adapt the difficulty level to grades 6-12.`;
    } else if (type === "quiz") {
      systemPrompt = `You are a quiz generator for Learniverse. Create educational quiz questions on the given topic.
      Return a JSON array with exactly 5 questions in this format:
      [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}]
      where "correct" is the index of the correct answer (0-3).
      Make questions progressively harder.
      Include explanations for learning.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: type !== "quiz",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service unavailable");
    }

    if (type === "quiz") {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Mentor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
