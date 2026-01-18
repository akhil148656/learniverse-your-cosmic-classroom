BEGIN;

-- Fix: avoid RLS infinite recursion on `assignments`.
-- The previous policies queried `student_assignments`, which has policies that reference `assignments`,
-- leading to recursion during SELECT/INSERT ... RETURNING.

-- 1) Helper functions that bypass RLS for internal checks.
CREATE OR REPLACE FUNCTION public.can_student_view_assignment(_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_assignments sa
    JOIN public.students s ON s.id = sa.student_id
    WHERE sa.assignment_id = _assignment_id
      AND s.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_parent_view_assignment(_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_assignments sa
    JOIN public.parent_students ps ON ps.student_id = sa.student_id
    WHERE sa.assignment_id = _assignment_id
      AND ps.parent_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_student_view_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_parent_view_assignment(uuid) TO authenticated;

-- 2) Replace the recursive policies with function-based ones.
DROP POLICY IF EXISTS "Students can view assigned assignments" ON public.assignments;
CREATE POLICY "Students can view assigned assignments" ON public.assignments
FOR SELECT
USING (public.can_student_view_assignment(assignments.id));

DROP POLICY IF EXISTS "Parents can view linked student assignments details" ON public.assignments;
CREATE POLICY "Parents can view linked student assignments details" ON public.assignments
FOR SELECT
USING (public.can_parent_view_assignment(assignments.id));

COMMIT;
