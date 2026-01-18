-- Add a dedicated parent display name field so saving parent name
-- does not overwrite student/teacher `full_name`.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_display_name TEXT;

COMMIT;
