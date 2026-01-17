-- Student self-serve join class by class_code (RLS-safe)

CREATE OR REPLACE FUNCTION public.student_join_class_by_code(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  target_class_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.id INTO target_class_id
  FROM public.classes c
  WHERE c.class_code = upper(_code)
  LIMIT 1;

  IF target_class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid class code';
  END IF;

  -- Upsert the current user's student row
  IF EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = auth.uid()) THEN
    UPDATE public.students
    SET class_id = target_class_id,
        learning_mode = 'classroom',
        updated_at = now()
    WHERE user_id = auth.uid();
  ELSE
    INSERT INTO public.students (user_id, class_id, learning_mode)
    VALUES (auth.uid(), target_class_id, 'classroom');
  END IF;

  RETURN target_class_id;
END;
$$;

REVOKE ALL ON FUNCTION public.student_join_class_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_join_class_by_code(TEXT) TO authenticated;

-- Enable realtime for teacher portals that are open while students join
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'students'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  END IF;
END $$;
