-- Prevent a parent from linking their OWN auth user as a student via student_code.
-- This avoids the parent name appearing as the child name.

BEGIN;

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
  target_student_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT s.id, s.user_id
  INTO target_student_id, target_student_user_id
  FROM public.students s
  WHERE s.student_code = upper(_student_code)
  LIMIT 1;

  IF target_student_id IS NULL THEN
    RAISE EXCEPTION 'Student code not found';
  END IF;

  -- Block linking yourself as your own "child".
  IF target_student_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot link your own account as a student. Use your child\'s student code.';
  END IF;

  INSERT INTO public.parent_students (parent_id, student_id)
  VALUES (auth.uid(), target_student_id)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  RETURN target_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.parent_link_student_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parent_link_student_by_code(TEXT) TO authenticated;

COMMIT;
