-- Notes table for students, teachers, and parents
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL CHECK (note_type IN ('personal', 'class', 'student', 'assignment')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_id UUID,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own notes
DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;
CREATE POLICY "Users can manage own notes" ON public.notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Teachers can view student notes if student is in their class
DROP POLICY IF EXISTS "Teachers can view class notes" ON public.notes;
CREATE POLICY "Teachers can view class notes" ON public.notes
  FOR SELECT USING (
    note_type = 'student' AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.user_id = notes.related_id AND c.teacher_id = auth.uid()
    )
  );
