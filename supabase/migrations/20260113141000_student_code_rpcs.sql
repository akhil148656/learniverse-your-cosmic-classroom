-- RPC helpers for using student_code safely with RLS enabled.
-- Teachers can add a student to their class using the student's code.
-- Parents can link themselves to a student using the student's code.

-- Find minimal student info by code (for UI confirmation)
CREATE OR REPLACE FUNCTION public.find_student_by_code(_student_code TEXT)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  grade_level INTEGER,
  class_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT s.id AS student_id,
         p.full_name,
         s.grade_level,
         s.class_id
  FROM public.students s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE auth.uid() IS NOT NULL
    AND s.student_code = upper(_student_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_student_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_student_by_code(TEXT) TO authenticated;

-- Teacher: assign a student to one of the teacher's classes by student_code
CREATE OR REPLACE FUNCTION public.teacher_add_student_to_class_by_code(
  _student_code TEXT,
  _class_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  target_student_id UUID;
  target_teacher_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.teacher_id INTO target_teacher_id
  FROM public.classes c
  WHERE c.id = _class_id;

  IF target_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  IF target_teacher_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT s.id INTO target_student_id
  FROM public.students s
  WHERE s.student_code = upper(_student_code)
  LIMIT 1;

  IF target_student_id IS NULL THEN
    RAISE EXCEPTION 'Student code not found';
  END IF;

  UPDATE public.students
  SET class_id = _class_id,
      learning_mode = 'classroom',
      updated_at = now()
  WHERE id = target_student_id;

  RETURN target_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_add_student_to_class_by_code(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_add_student_to_class_by_code(TEXT, UUID) TO authenticated;

-- Parent: link a student to the current parent user by student_code
CREATE OR REPLACE FUNCTION public.parent_link_student_by_code(
  _student_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  target_student_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT s.id INTO target_student_id
  FROM public.students s
  WHERE s.student_code = upper(_student_code)
  LIMIT 1;

  IF target_student_id IS NULL THEN
    RAISE EXCEPTION 'Student code not found';
  END IF;

  INSERT INTO public.parent_students (parent_id, student_id)
  VALUES (auth.uid(), target_student_id)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  RETURN target_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.parent_link_student_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parent_link_student_by_code(TEXT) TO authenticated;
