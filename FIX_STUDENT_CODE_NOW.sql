-- ============================================================================
-- EMERGENCY FIX: Run this entire file in Supabase SQL Editor
-- ============================================================================
-- This fixes the "function gen_random_bytes(integer) does not exist" error
-- that prevents students from completing onboarding.
--
-- HOW TO USE:
-- 1. Copy this ENTIRE file
-- 2. Go to your Supabase Dashboard → SQL Editor
-- 3. Paste this entire content
-- 4. Click "Run" (or press Ctrl+Enter)
-- 5. You should see "Success. No rows returned"
-- 6. Refresh your app and try "Start Learning" again
-- ============================================================================

-- Step 1: Install pgcrypto in the extensions schema (Supabase standard location)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Step 2: Recreate the student code generator with fully-qualified function calls
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
    -- Use fully-qualified function name to avoid search_path issues
    code := 'STU-' || upper(encode(extensions.gen_random_bytes(5), 'hex'));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.students s WHERE s.student_code = code
    );
  END LOOP;
  RETURN code;
END;
$$;

-- Step 3: Recreate the trigger function
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

-- Step 4: Ensure the trigger is active
DROP TRIGGER IF EXISTS set_student_code_before_insert ON public.students;
CREATE TRIGGER set_student_code_before_insert
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_student_code();

-- Step 5: Backfill any existing students that are missing student_code
UPDATE public.students
SET student_code = public.generate_student_code()
WHERE student_code IS NULL OR student_code = '';

-- Step 6: Test the function works (you should see output like "STU-1A2B3C4D5E")
SELECT public.generate_student_code() AS test_code;

-- ============================================================================
-- If you see a code like "STU-XXXXX..." in the Results panel, it worked!
-- Now refresh your app at http://127.0.0.1:5173/student/onboarding
-- ============================================================================
