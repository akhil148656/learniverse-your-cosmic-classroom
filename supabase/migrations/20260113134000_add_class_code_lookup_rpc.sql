-- Allow students to validate/join a class by code without granting broad SELECT on public.classes.
-- This avoids RLS cycles and keeps classes private unless you know the code.

CREATE OR REPLACE FUNCTION public.find_class_by_code(_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  grade_level INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT c.id, c.name, c.grade_level
  FROM public.classes c
  WHERE auth.uid() IS NOT NULL
    AND c.class_code = upper(_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_class_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_class_by_code(TEXT) TO authenticated;
