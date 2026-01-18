BEGIN;

-- Students: allow reading assignment details if an assignment is actually assigned to them.
-- This prevents null embedded `assignments(*)` when the student's current class_id differs
-- from the assignment's class_id (or class_id is null), but a student_assignments row exists.
DROP POLICY IF EXISTS "Students can view assigned assignments" ON public.assignments;
CREATE POLICY "Students can view assigned assignments" ON public.assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.student_assignments sa
    JOIN public.students s ON s.id = sa.student_id
    WHERE sa.assignment_id = assignments.id
      AND s.user_id = auth.uid()
  )
);

-- Parents: allow reading assignment details if the assignment is linked via a child's submission row.
DROP POLICY IF EXISTS "Parents can view linked student assignments details" ON public.assignments;
CREATE POLICY "Parents can view linked student assignments details" ON public.assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.student_assignments sa
    JOIN public.parent_students ps ON ps.student_id = sa.student_id
    WHERE ps.parent_id = auth.uid()
      AND sa.assignment_id = assignments.id
  )
);

COMMIT;
