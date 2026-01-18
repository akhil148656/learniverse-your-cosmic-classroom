-- Enable multiple teachers per class via class-teachers join + RLS-safe helpers

BEGIN;

-- Many-to-many: additional teachers attached to a class (beyond classes.teacher_id owner)
CREATE TABLE IF NOT EXISTS public.class_teachers (
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, teacher_id)
);

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

-- Helper: is a user a teacher of this class? (owner OR member)
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(_teacher_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = _class_id
      AND c.teacher_id = _teacher_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.class_teachers ct
    WHERE ct.class_id = _class_id
      AND ct.teacher_id = _teacher_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_teacher_of_class(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(UUID, UUID) TO authenticated;

-- RLS: teachers can see/manage their own membership rows
DROP POLICY IF EXISTS "Teachers can view own class memberships" ON public.class_teachers;
CREATE POLICY "Teachers can view own class memberships" ON public.class_teachers
FOR SELECT
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can join classes" ON public.class_teachers;
CREATE POLICY "Teachers can join classes" ON public.class_teachers
FOR INSERT
WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can leave classes" ON public.class_teachers;
CREATE POLICY "Teachers can leave classes" ON public.class_teachers
FOR DELETE
USING (teacher_id = auth.uid());

-- RPC: teacher self-serve join a class by class_code
CREATE OR REPLACE FUNCTION public.teacher_join_class_by_code(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  target_class_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.id INTO target_class_id
  FROM public.classes c
  WHERE c.class_code = upper(_code)
  LIMIT 1;

  IF target_class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid class code';
  END IF;

  INSERT INTO public.class_teachers (class_id, teacher_id)
  VALUES (target_class_id, auth.uid())
  ON CONFLICT (class_id, teacher_id) DO NOTHING;

  RETURN target_class_id;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_join_class_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_join_class_by_code(TEXT) TO authenticated;

-- Classes: keep full management for owner teacher, but allow other class teachers to SELECT
DROP POLICY IF EXISTS "Teachers can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can manage own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view shared classes" ON public.classes;

CREATE POLICY "Teachers can manage own classes" ON public.classes
FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view shared classes" ON public.classes
FOR SELECT
USING (public.is_teacher_of_class(auth.uid(), id));

-- Students: allow any teacher of the class to view students
DROP POLICY IF EXISTS "Teachers can view class students" ON public.students;
CREATE POLICY "Teachers can view class students" ON public.students
FOR SELECT
USING (public.is_teacher_of_class(auth.uid(), students.class_id));

-- Assignments: teachers manage their own assignments, but can only create/update for classes they teach
DROP POLICY IF EXISTS "Teachers can manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can manage own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can create assignments for their classes" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can update own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can delete own assignments" ON public.assignments;

CREATE POLICY "Teachers can manage own assignments" ON public.assignments
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create assignments for their classes" ON public.assignments
FOR INSERT
WITH CHECK (
  auth.uid() = teacher_id
  AND public.is_teacher_of_class(auth.uid(), class_id)
);

CREATE POLICY "Teachers can update own assignments" ON public.assignments
FOR UPDATE
USING (auth.uid() = teacher_id)
WITH CHECK (
  auth.uid() = teacher_id
  AND public.is_teacher_of_class(auth.uid(), class_id)
);

CREATE POLICY "Teachers can delete own assignments" ON public.assignments
FOR DELETE
USING (auth.uid() = teacher_id);

-- Student assignments: teacher actions permitted if the teacher is attached to the assignment's class
DROP POLICY IF EXISTS "Teachers can view class submissions" ON public.student_assignments;
DROP POLICY IF EXISTS "Teachers can update class submissions" ON public.student_assignments;
DROP POLICY IF EXISTS "Teachers can assign to class students" ON public.student_assignments;

CREATE POLICY "Teachers can view class submissions" ON public.student_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = student_assignments.assignment_id
      AND public.is_teacher_of_class(auth.uid(), a.class_id)
  )
);

CREATE POLICY "Teachers can update class submissions" ON public.student_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = student_assignments.assignment_id
      AND public.is_teacher_of_class(auth.uid(), a.class_id)
  )
);

CREATE POLICY "Teachers can assign to class students" ON public.student_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = assignment_id
      AND public.is_teacher_of_class(auth.uid(), a.class_id)
  )
);

COMMIT;
