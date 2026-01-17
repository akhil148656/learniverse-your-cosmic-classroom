-- Fix student_code generator on Supabase: SECURITY DEFINER functions used a restricted search_path
-- which hid pgcrypto functions (gen_random_bytes / gen_random_uuid) in the extensions schema.

-- Ensure pgcrypto exists in the standard Supabase schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate generator with a search_path that includes extensions.
CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
SET row_security = off
AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := 'STU-' || upper(encode(extensions.gen_random_bytes(5), 'hex'));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.students s WHERE s.student_code = code
    );
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_student_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
SET row_security = off
AS $$
BEGIN
  IF NEW.student_code IS NULL OR NEW.student_code = '' THEN
    NEW.student_code := public.generate_student_code();
  ELSE
    NEW.student_code := upper(NEW.student_code);
  END IF;
  RETURN NEW;
END;
$$;
