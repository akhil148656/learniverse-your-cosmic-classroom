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
    const { studentId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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
    };

    console.log("Generating AI feedback for student:", performance.student_name);

    const prompt = `Analyze the following student performance data and provide personalized feedback for their parents and teachers.

Student: ${performance.student_name}
Total XP: ${performance.total_xp}
Focus Score: ${performance.focus_score}%
Topics Completed: ${performance.topics_completed}
Quizzes Attempted: ${performance.quizzes_attempted}
Quizzes Passed: ${performance.quizzes_passed}
Average Score: ${performance.average_score}%
Total Study Time: ${performance.study_time_minutes} minutes

Provide:
1. A brief summary of the student's learning progress
2. Strengths identified from the data
3. Areas for improvement
4. Specific recommendations for parents to help their child
5. Suggestions for the teacher

Keep the feedback encouraging, constructive, and actionable. Format as a clear, parent-friendly report.`;

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
            content: "You are an AI educational analyst for Learniverse. Provide insightful, encouraging, and actionable feedback about student performance. Be specific and constructive." 
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
    const feedbackText = data.choices?.[0]?.message?.content || "Unable to generate feedback at this time.";

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
      performance 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate feedback error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
