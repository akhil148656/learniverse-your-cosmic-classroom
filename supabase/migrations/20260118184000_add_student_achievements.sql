-- Student achievements: teacher-created achievements shown to parents/students

CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

-- Teachers: manage achievements for students in their classes
DROP POLICY IF EXISTS "Teachers manage student achievements" ON public.student_achievements;
CREATE POLICY "Teachers manage student achievements"
ON public.student_achievements
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.id = student_achievements.student_id
      AND c.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.id = student_achievements.student_id
      AND c.teacher_id = auth.uid()
  )
);

-- Parents: view achievements for linked children
DROP POLICY IF EXISTS "Parents view child achievements" ON public.student_achievements;
CREATE POLICY "Parents view child achievements"
ON public.student_achievements
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    WHERE ps.parent_id = auth.uid()
      AND ps.student_id = student_achievements.student_id
  )
);

-- Students: view their own achievements
DROP POLICY IF EXISTS "Students view own achievements" ON public.student_achievements;
CREATE POLICY "Students view own achievements"
ON public.student_achievements
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_achievements.student_id
      AND s.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id_awarded_at
  ON public.student_achievements (student_id, awarded_at DESC);
