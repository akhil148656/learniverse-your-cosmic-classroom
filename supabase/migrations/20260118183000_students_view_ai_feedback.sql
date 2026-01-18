-- Allow students to view their own AI feedback (for Student portal)

-- Students can view feedback rows for their own student record
DROP POLICY IF EXISTS "Students view own AI feedback" ON public.ai_feedback;
CREATE POLICY "Students view own AI feedback"
ON public.ai_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = ai_feedback.student_id
      AND s.user_id = auth.uid()
  )
);
