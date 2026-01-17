-- Fix teacher grading updates + allow parents to view grades/feedback for linked children.

-- 1) Student submissions: ensure UPDATE policies have both USING and WITH CHECK.
DROP POLICY IF EXISTS "Teachers can update class submissions" ON public.student_assignments;
CREATE POLICY "Teachers can update class submissions" ON public.student_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON a.class_id = c.id
      WHERE a.id = student_assignments.assignment_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON a.class_id = c.id
      WHERE a.id = student_assignments.assignment_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can manage own submissions" ON public.student_assignments;
CREATE POLICY "Students can manage own submissions" ON public.student_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE id = student_assignments.student_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE id = student_assignments.student_id AND user_id = auth.uid()
    )
  );

-- 2) Parents: allow read-only visibility for linked children.
DROP POLICY IF EXISTS "Parents can view linked students" ON public.students;
CREATE POLICY "Parents can view linked students" ON public.students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.parent_id = auth.uid() AND ps.student_id = students.id
    )
  );

DROP POLICY IF EXISTS "Parents can view linked student profiles" ON public.profiles;
CREATE POLICY "Parents can view linked student profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      JOIN public.students s ON s.id = ps.student_id
      WHERE ps.parent_id = auth.uid() AND s.user_id = profiles.user_id
    )
  );

DROP POLICY IF EXISTS "Parents can view child analytics" ON public.student_analytics;
CREATE POLICY "Parents can view child analytics" ON public.student_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.parent_id = auth.uid() AND ps.student_id = student_analytics.student_id
    )
  );

DROP POLICY IF EXISTS "Parents can view child submissions" ON public.student_assignments;
CREATE POLICY "Parents can view child submissions" ON public.student_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.parent_id = auth.uid() AND ps.student_id = student_assignments.student_id
    )
  );

DROP POLICY IF EXISTS "Parents can view child class assignments" ON public.assignments;
CREATE POLICY "Parents can view child class assignments" ON public.assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      JOIN public.students s ON s.id = ps.student_id
      WHERE ps.parent_id = auth.uid() AND s.class_id = assignments.class_id
    )
  );
