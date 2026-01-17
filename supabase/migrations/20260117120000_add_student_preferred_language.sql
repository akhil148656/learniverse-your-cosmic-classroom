-- Capture student preferred language for personalized learning content (e.g., YouTube recommendations)

BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS preferred_language TEXT;

-- Accept ISO-639-1 codes (e.g., 'en', 'hi') and optional region (e.g., 'en-IN')
ALTER TABLE public.students
  ADD CONSTRAINT students_preferred_language_format
  CHECK (
    preferred_language IS NULL
    OR preferred_language ~ '^[a-z]{2}(-[A-Z]{2})?$'
  );

COMMIT;
