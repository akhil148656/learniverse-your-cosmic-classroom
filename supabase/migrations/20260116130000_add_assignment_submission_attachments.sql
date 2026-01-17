-- Add attachment metadata to student assignment submissions + create storage bucket/policies

BEGIN;

-- DB columns for submission attachments
ALTER TABLE public.student_assignments
  ADD COLUMN IF NOT EXISTS submission_attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS submission_attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS submission_attachment_mime TEXT;

-- Storage bucket + policies for assignment submissions.
-- In some Supabase setups, the SQL Editor role cannot CREATE POLICY on storage.objects
-- (error: must be owner of table objects). We wrap these steps to avoid failing the migration.
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('assignment-submissions', 'assignment-submissions', false)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage.buckets insert (insufficient privilege). Create bucket "assignment-submissions" in Dashboard → Storage.';
  END;

  BEGIN
    -- Policies: MVP-safe (any authenticated user can read/write objects in this bucket)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Authenticated can read assignment submissions'
    ) THEN
      CREATE POLICY "Authenticated can read assignment submissions"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'assignment-submissions');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Authenticated can upload assignment submissions'
    ) THEN
      CREATE POLICY "Authenticated can upload assignment submissions"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'assignment-submissions');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Authenticated can update assignment submissions'
    ) THEN
      CREATE POLICY "Authenticated can update assignment submissions"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'assignment-submissions')
      WITH CHECK (bucket_id = 'assignment-submissions');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Authenticated can delete assignment submissions'
    ) THEN
      CREATE POLICY "Authenticated can delete assignment submissions"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'assignment-submissions');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage.objects policies (insufficient privilege). Create policies in Dashboard → Storage → Policies for bucket "assignment-submissions".';
  END;
END $$;

COMMIT;
