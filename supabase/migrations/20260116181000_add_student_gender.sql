-- Capture student gender for parent/teacher views (used to display son/daughter)

BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

COMMIT;
