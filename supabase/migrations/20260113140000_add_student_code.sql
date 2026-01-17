-- Add a shareable, unique student code (used by teachers/parents to link students)

-- Ensure pgcrypto is available for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_code TEXT;

-- Generate a random, hard-to-guess code like STU-<10 HEX CHARS>
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

DROP TRIGGER IF EXISTS set_student_code_before_insert ON public.students;
CREATE TRIGGER set_student_code_before_insert
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_student_code();

-- Backfill existing students
UPDATE public.students
SET student_code = public.generate_student_code()
WHERE student_code IS NULL OR student_code = '';

-- Enforce uniqueness and non-null
ALTER TABLE public.students
  ALTER COLUMN student_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS students_student_code_unique
  ON public.students(student_code);
