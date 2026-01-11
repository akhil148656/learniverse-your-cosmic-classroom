import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, difficulty, questionCount = 5, gradeLevel = 10 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating quiz for topic: ${topic}, difficulty: ${difficulty}, grade: ${gradeLevel}`);

    const prompt = `Create a ${questionCount}-question multiple choice quiz on the topic "${topic}" for grade ${gradeLevel} students.
Difficulty level: ${difficulty || 'medium'}

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "You are an educational quiz generator for Learniverse. Generate accurate, educational quiz questions. Return ONLY valid JSON arrays with no markdown or extra text." 
          },
          { role: "user", content: prompt },
        ],
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

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "[]";
    
    // Clean the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let questions;
    try {
      questions = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse quiz questions:", parseError, content);
      throw new Error("Failed to parse quiz questions");
    }

    // Optionally save the quiz to database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: `Quiz: ${topic}`,
        description: `AI-generated quiz on ${topic}`,
        difficulty_level: difficulty === "easy" ? 1 : difficulty === "hard" ? 3 : 2,
        time_limit_minutes: questionCount * 2,
      })
      .select()
      .single();

    if (quiz && !quizError) {
      // Save questions
      const questionsToInsert = questions.map((q: any) => ({
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
      difficulty,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate quiz error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
