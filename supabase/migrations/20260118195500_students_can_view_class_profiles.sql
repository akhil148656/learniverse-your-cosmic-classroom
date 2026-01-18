-- Allow students to view profile names of classmates + their class teacher.
-- Needed for Discussions UI (avoid showing "Anonymous" for everyone).

BEGIN;

CREATE OR REPLACE FUNCTION public.can_view_class_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH viewer AS (
    SELECT s.class_id
    FROM public.students s
    WHERE s.user_id = auth.uid()
    LIMIT 1
  )
  SELECT
    auth.uid() = target_user_id
    OR EXISTS (
      SELECT 1
      FROM viewer v
      WHERE v.class_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.students st
            WHERE st.user_id = target_user_id
              AND st.class_id = v.class_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.classes c
            WHERE c.id = v.class_id
              AND c.teacher_id = target_user_id
          )
        )
    );
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Students can view class member profiles'
  ) THEN
    CREATE POLICY "Students can view class member profiles" ON public.profiles
      FOR SELECT
      TO authenticated
      USING (public.can_view_class_profile(profiles.user_id));
  END IF;
END $$;

COMMIT;
