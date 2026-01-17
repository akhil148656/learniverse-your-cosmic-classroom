-- Ensure every class gets a shared default discussion room once students join

-- Prevent duplicate default rooms per class
CREATE UNIQUE INDEX IF NOT EXISTS discussion_rooms_default_per_class_uidx
ON public.discussion_rooms (class_id)
WHERE topic_id IS NULL AND name = 'Class Discussion';

-- Create (or return) the default room for a class
CREATE OR REPLACE FUNCTION public.ensure_class_discussion_room(_class_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  room_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _class_id IS NULL THEN
    RAISE EXCEPTION 'Class id required';
  END IF;

  SELECT r.id INTO room_id
  FROM public.discussion_rooms r
  WHERE r.class_id = _class_id
    AND r.topic_id IS NULL
    AND r.name = 'Class Discussion'
  LIMIT 1;

  IF room_id IS NOT NULL THEN
    RETURN room_id;
  END IF;

  INSERT INTO public.discussion_rooms (class_id, name, max_participants)
  VALUES (_class_id, 'Class Discussion', 50)
  ON CONFLICT (class_id)
    WHERE (topic_id IS NULL AND name = 'Class Discussion')
  DO NOTHING;

  SELECT r.id INTO room_id
  FROM public.discussion_rooms r
  WHERE r.class_id = _class_id
    AND r.topic_id IS NULL
    AND r.name = 'Class Discussion'
  LIMIT 1;

  RETURN room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_class_discussion_room(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_class_discussion_room(UUID) TO authenticated;

-- Update student join RPC to auto-create the class discussion room
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

  -- Ensure there is at least one shared room for the class
  PERFORM public.ensure_class_discussion_room(target_class_id);

  RETURN target_class_id;
END;
$$;

REVOKE ALL ON FUNCTION public.student_join_class_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_join_class_by_code(TEXT) TO authenticated;

-- Update teacher add-student RPC to also ensure the default room exists
CREATE OR REPLACE FUNCTION public.teacher_add_student_to_class_by_code(
  _student_code TEXT,
  _class_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  target_student_id UUID;
  target_teacher_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.teacher_id INTO target_teacher_id
  FROM public.classes c
  WHERE c.id = _class_id;

  IF target_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  IF target_teacher_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT s.id INTO target_student_id
  FROM public.students s
  WHERE s.student_code = upper(_student_code)
  LIMIT 1;

  IF target_student_id IS NULL THEN
    RAISE EXCEPTION 'Student code not found';
  END IF;

  UPDATE public.students
  SET class_id = _class_id,
      learning_mode = 'classroom',
      updated_at = now()
  WHERE id = target_student_id;

  PERFORM public.ensure_class_discussion_room(_class_id);

  RETURN target_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_add_student_to_class_by_code(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_add_student_to_class_by_code(TEXT, UUID) TO authenticated;
