-- Add gender to profiles so it can be shown/edited on the profile screen
-- Keep the same allowed values used on students.gender.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_gender_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_check
      CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;
END $$;

-- Backfill profiles.gender from students.gender when available
UPDATE public.profiles p
SET gender = s.gender
FROM public.students s
WHERE s.user_id = p.user_id
  AND p.gender IS NULL
  AND s.gender IS NOT NULL;

-- Allow users to create their own profile if it ever goes missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
