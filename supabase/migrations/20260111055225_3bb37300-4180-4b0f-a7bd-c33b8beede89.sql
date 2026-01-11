-- Allow teachers to insert assignments to students in their classes
CREATE POLICY "Teachers can assign to class students"
ON public.student_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
  )
);

-- Allow service role / edge functions to insert AI feedback
CREATE POLICY "Service role can insert AI feedback"
ON public.ai_feedback
FOR INSERT
WITH CHECK (true);

-- Allow teachers to view AI feedback for their class students
CREATE POLICY "Teachers view class student feedback"
ON public.ai_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ai_feedback.student_id AND c.teacher_id = auth.uid()
  )
);

-- Allow teachers to create quizzes and questions
CREATE POLICY "Teachers can create quizzes"
ON public.quizzes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Teachers can manage their quizzes"
ON public.quizzes
FOR ALL
USING (true);

CREATE POLICY "Teachers can insert quiz questions"
ON public.quiz_questions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Teachers can manage quiz questions"
ON public.quiz_questions
FOR ALL
USING (true);

-- Allow teachers to create discussion rooms for their classes
CREATE POLICY "Teachers can create discussion rooms"
ON public.discussion_rooms
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = class_id AND c.teacher_id = auth.uid()
  )
);

-- Students can create discussion rooms for their class
CREATE POLICY "Students can create discussion rooms"
ON public.discussion_rooms
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.user_id = auth.uid() AND s.class_id = class_id
  )
);

-- Allow inserting notifications from service role
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Allow inserting learning suggestions from service role
CREATE POLICY "Service role can insert suggestions"
ON public.learning_suggestions
FOR INSERT
WITH CHECK (true);

-- Create function to get student performance summary for AI feedback
CREATE OR REPLACE FUNCTION public.get_student_performance_summary(student_uuid UUID)
RETURNS TABLE (
  student_name TEXT,
  total_xp INTEGER,
  focus_score INTEGER,
  topics_completed INTEGER,
  quizzes_attempted INTEGER,
  quizzes_passed INTEGER,
  average_score NUMERIC,
  study_time_minutes INTEGER,
  recent_quiz_attempts JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.full_name::TEXT as student_name,
    COALESCE(s.xp_points, 0)::INTEGER as total_xp,
    COALESCE(s.focus_score, 100)::INTEGER as focus_score,
    COALESCE(SUM(sa.topics_completed), 0)::INTEGER as topics_completed,
    COALESCE(SUM(sa.quizzes_attempted), 0)::INTEGER as quizzes_attempted,
    COALESCE(SUM(sa.quizzes_passed), 0)::INTEGER as quizzes_passed,
    COALESCE(AVG(sa.average_score), 0)::NUMERIC as average_score,
    COALESCE(SUM(sa.study_time_minutes), 0)::INTEGER as study_time_minutes,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(qa.*))
       FROM quiz_attempts qa
       WHERE qa.student_id = s.id
       ORDER BY qa.created_at DESC
       LIMIT 5),
      '[]'::JSONB
    ) as recent_quiz_attempts
  FROM students s
  LEFT JOIN profiles p ON s.user_id = p.user_id
  LEFT JOIN student_analytics sa ON sa.student_id = s.id
  WHERE s.id = student_uuid
  GROUP BY p.full_name, s.xp_points, s.focus_score, s.id;
END;
$$;