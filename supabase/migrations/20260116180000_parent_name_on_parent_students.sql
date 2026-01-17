-- Store a parent-provided display name on the parent<->student link
-- so the parent dashboard can show "Parent: <name>" per linked child.

BEGIN;

ALTER TABLE public.parent_students
  ADD COLUMN IF NOT EXISTS parent_name TEXT;

-- Parents can update their own link metadata (e.g., parent_name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'parent_students'
      AND policyname = 'Parents can update own student links'
  ) THEN
    CREATE POLICY "Parents can update own student links"
    ON public.parent_students
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = parent_id)
    WITH CHECK (auth.uid() = parent_id);
  END IF;
END $$;

COMMIT;
