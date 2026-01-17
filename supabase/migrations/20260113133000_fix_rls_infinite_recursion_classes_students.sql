-- Fix: "infinite recursion detected" in RLS policies for public.classes/public.students
--
-- Root cause:
-- - classes policy referenced students
-- - students policy referenced classes
-- This creates an evaluation cycle under RLS.
--
-- Approach:
-- Use SECURITY DEFINER helper functions to look up class_id/teacher_id without invoking
-- the other table's RLS policies, then reference only those helpers inside policies.

-- Helper: get the current student's class_id
CREATE OR REPLACE FUNCTION public.get_student_class_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT s.class_id
  FROM public.students s
  WHERE s.user_id = _user_id
  LIMIT 1
$$;

-- Helper: get a class's teacher_id
CREATE OR REPLACE FUNCTION public.get_class_teacher_id(_class_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT c.teacher_id
  FROM public.classes c
  WHERE c.id = _class_id
  LIMIT 1
$$;

-- Drop the recursive policies (safe to run multiple times)
DROP POLICY IF EXISTS "Teachers can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view their class" ON public.classes;

DROP POLICY IF EXISTS "Users can view own student record" ON public.students;
DROP POLICY IF EXISTS "Users can update own student record" ON public.students;
DROP POLICY IF EXISTS "Users can insert own student record" ON public.students;
DROP POLICY IF EXISTS "Teachers can view class students" ON public.students;

-- Recreate policies without cross-table recursion

-- Classes
CREATE POLICY "Teachers can manage classes" ON public.classes
  FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view their class" ON public.classes
  FOR SELECT
  USING (id = public.get_student_class_id(auth.uid()));

-- Students
CREATE POLICY "Users can view own student record" ON public.students
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own student record" ON public.students
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own student record" ON public.students
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view class students" ON public.students
  FOR SELECT
  USING (public.get_class_teacher_id(students.class_id) = auth.uid());
