BEGIN;

-- Refine student visibility: a student should only see assignments for their CURRENT class.
-- This avoids showing stale/out-of-class assignments when a student moves classes but
-- old rows still exist in student_assignments.

DROP POLICY IF EXISTS "Students can view assigned assignments" ON public.assignments;
CREATE POLICY "Students can view assigned assignments" ON public.assignments
FOR SELECT
USING (
  public.can_student_view_assignment(assignments.id)
  AND assignments.class_id = public.get_student_class_id(auth.uid())
);

COMMIT;
