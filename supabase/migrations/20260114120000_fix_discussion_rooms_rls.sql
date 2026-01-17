-- Tighten discussion room/message access to class membership

-- Replace permissive policies from initial schema
DROP POLICY IF EXISTS "Discussion rooms viewable by class members" ON public.discussion_rooms;
DROP POLICY IF EXISTS "Messages viewable in rooms" ON public.discussion_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.discussion_messages;

-- Only students in the class (or the class teacher) can view rooms
CREATE POLICY "Class members can view discussion rooms"
ON public.discussion_rooms
FOR SELECT
USING (
  class_id IS NOT NULL
  AND (
    class_id = public.get_student_class_id(auth.uid())
    OR public.get_class_teacher_id(class_id) = auth.uid()
  )
);

-- Only class members (or the class teacher) can view messages in a room
CREATE POLICY "Class members can view discussion messages"
ON public.discussion_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.discussion_rooms r
    WHERE r.id = discussion_messages.room_id
      AND r.class_id IS NOT NULL
      AND (
        r.class_id = public.get_student_class_id(auth.uid())
        OR public.get_class_teacher_id(r.class_id) = auth.uid()
      )
  )
);

-- Only class members (or the class teacher) can insert messages
CREATE POLICY "Class members can send discussion messages"
ON public.discussion_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.discussion_rooms r
    WHERE r.id = discussion_messages.room_id
      AND r.class_id IS NOT NULL
      AND (
        r.class_id = public.get_student_class_id(auth.uid())
        OR public.get_class_teacher_id(r.class_id) = auth.uid()
      )
  )
);

-- Performance: messages are always queried by room + time
CREATE INDEX IF NOT EXISTS discussion_messages_room_created_at_idx
ON public.discussion_messages (room_id, created_at);

-- Ensure realtime can broadcast INSERTs on discussion_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'discussion_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_messages;
  END IF;
END $$;
