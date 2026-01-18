-- Add teacher acknowledgement fields + allow teacher/parent delete

ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS teacher_acknowledged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS teacher_acknowledged_by UUID;

-- Teachers can update feedback status for their class students
CREATE POLICY "Teachers can update class student feedback"
ON public.ai_feedback
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.id = ai_feedback.student_id AND c.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.id = ai_feedback.student_id AND c.teacher_id = auth.uid()
  )
);

-- Teachers can delete feedback for their class students
CREATE POLICY "Teachers can delete class student feedback"
ON public.ai_feedback
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.id = ai_feedback.student_id AND c.teacher_id = auth.uid()
  )
);

-- Parents can delete their children's feedback
CREATE POLICY "Parents can delete child feedback"
ON public.ai_feedback
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.parent_students ps
    WHERE ps.parent_id = auth.uid() AND ps.student_id = ai_feedback.student_id
  )
);
