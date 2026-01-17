-- RLS policies needed for parent + teacher dashboards to read child/class analytics

BEGIN;

-- Parent-Student relationship: parents must be able to read their own links.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'parent_students'
      AND policyname = 'Parents view own student links'
  ) THEN
    CREATE POLICY "Parents view own student links"
    ON public.parent_students
    FOR SELECT
    USING (auth.uid() = parent_id);
  END IF;
END $$;

-- Parents should be able to view their linked students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'students'
      AND policyname = 'Parents can view linked students'
  ) THEN
    CREATE POLICY "Parents can view linked students"
    ON public.students
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.parent_students ps
        WHERE ps.parent_id = auth.uid()
          AND ps.student_id = students.id
      )
    );
  END IF;
END $$;

-- Parents can view linked student profiles (for names on dashboard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Parents can view linked student profiles'
  ) THEN
    CREATE POLICY "Parents can view linked student profiles"
    ON public.profiles
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.parent_students ps
        JOIN public.students s ON s.id = ps.student_id
        WHERE ps.parent_id = auth.uid()
          AND s.user_id = profiles.user_id
      )
    );
  END IF;
END $$;

-- Parents can view assignments for their linked children (needed for max_score joins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assignments'
      AND policyname = 'Parents can view child class assignments'
  ) THEN
    CREATE POLICY "Parents can view child class assignments"
    ON public.assignments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.parent_students ps
        JOIN public.students s ON s.id = ps.student_id
        WHERE ps.parent_id = auth.uid()
          AND s.class_id = assignments.class_id
      )
    );
  END IF;
END $$;

-- Parents can view classes for their linked students (to show class name/code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'classes'
      AND policyname = 'Parents can view linked student classes'
  ) THEN
    CREATE POLICY "Parents can view linked student classes"
    ON public.classes
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.parent_students ps
        JOIN public.students s ON s.id = ps.student_id
        WHERE ps.parent_id = auth.uid()
          AND s.class_id = classes.id
      )
    );
  END IF;
END $$;

-- Parents can view the teacher profile for their linked student's class
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Parents can view linked class teacher profiles'
  ) THEN
    CREATE POLICY "Parents can view linked class teacher profiles"
    ON public.profiles
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.parent_students ps
        JOIN public.students s ON s.id = ps.student_id
        JOIN public.classes c ON c.id = s.class_id
        WHERE ps.parent_id = auth.uid()
          AND c.teacher_id = profiles.user_id
      )
    );
  END IF;
END $$;

-- Parents can view linked students' analytics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_analytics'
      AND policyname = 'Parents can view linked student analytics'
  ) THEN
    CREATE POLICY "Parents can view linked student analytics"
    ON public.student_analytics
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.parent_students ps
        WHERE ps.parent_id = auth.uid()
          AND ps.student_id = student_analytics.student_id
      )
    );
  END IF;
END $$;

-- Parents can view linked students' assignment submissions/grades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_assignments'
      AND policyname = 'Parents can view linked student assignments'
  ) THEN
    CREATE POLICY "Parents can view linked student assignments"
    ON public.student_assignments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.parent_students ps
        WHERE ps.parent_id = auth.uid()
          AND ps.student_id = student_assignments.student_id
      )
    );
  END IF;
END $$;

-- Parents can view linked students' quiz attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quiz_attempts'
      AND policyname = 'Parents can view linked student quiz attempts'
  ) THEN
    CREATE POLICY "Parents can view linked student quiz attempts"
    ON public.quiz_attempts
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.parent_students ps
        WHERE ps.parent_id = auth.uid()
          AND ps.student_id = quiz_attempts.student_id
      )
    );
  END IF;
END $$;

-- Teachers can view quiz attempts for students in their class
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quiz_attempts'
      AND policyname = 'Teachers can view class quiz attempts'
  ) THEN
    CREATE POLICY "Teachers can view class quiz attempts"
    ON public.quiz_attempts
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.students s
        JOIN public.classes c ON c.id = s.class_id
        WHERE s.id = quiz_attempts.student_id
          AND c.teacher_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Teachers can view search history for students in their class (used as proxy for "learning today")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'search_history'
      AND policyname = 'Teachers can view class search history'
  ) THEN
    CREATE POLICY "Teachers can view class search history"
    ON public.search_history
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.students s
        JOIN public.classes c ON c.id = s.class_id
        WHERE s.id = search_history.student_id
          AND c.teacher_id = auth.uid()
      )
    );
  END IF;
END $$;

COMMIT;
