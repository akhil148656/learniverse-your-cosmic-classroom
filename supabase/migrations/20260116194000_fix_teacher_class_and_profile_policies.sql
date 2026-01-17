-- Fix teacher portal visibility for classes + analytics + student names.
-- Some teacher pages rely on reading students + student_analytics, and showing student names from profiles.
-- This migration ensures the teacher policies exist (or are corrected) in an idempotent way.

BEGIN;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Classes: teacher can create/read/update/delete their own classes
DROP POLICY IF EXISTS "Teachers can manage classes" ON public.classes;
CREATE POLICY "Teachers can manage classes" ON public.classes
  FOR ALL
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Students: teacher can view students in their class
DROP POLICY IF EXISTS "Teachers can view class students" ON public.students;
CREATE POLICY "Teachers can view class students" ON public.students
  FOR SELECT
  TO authenticated
  USING (public.get_class_teacher_id(students.class_id) = auth.uid());

-- Student analytics: teacher can view analytics for students in their class
DROP POLICY IF EXISTS "Teachers view class analytics" ON public.student_analytics;
CREATE POLICY "Teachers view class analytics" ON public.student_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_analytics.student_id
        AND public.get_class_teacher_id(s.class_id) = auth.uid()
    )
  );

-- Profiles: teacher can view profile names of students in their class
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Teachers can view class student profiles'
  ) THEN
    CREATE POLICY "Teachers can view class student profiles" ON public.profiles
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.students s
          WHERE s.user_id = profiles.user_id
            AND public.get_class_teacher_id(s.class_id) = auth.uid()
        )
      );
  END IF;
END $$;

COMMIT;
