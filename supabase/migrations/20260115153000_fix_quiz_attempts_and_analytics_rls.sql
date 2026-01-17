-- Fix RLS policies to allow INSERT/UPDATE with proper WITH CHECK.
-- Existing policies used only USING, which can block inserts.

BEGIN;

DROP POLICY IF EXISTS "Students manage own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Students manage own quiz attempts"
ON public.quiz_attempts
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE id = quiz_attempts.student_id
      AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE id = quiz_attempts.student_id
      AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students can manage own analytics" ON public.student_analytics;
CREATE POLICY "Students can manage own analytics"
ON public.student_analytics
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE id = student_analytics.student_id
      AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE id = student_analytics.student_id
      AND user_id = auth.uid()
  )
);

COMMIT;
