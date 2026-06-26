-- Fix all Row Level Security (RLS) policies to fully support co-teachers.
-- Replaces functions and owner-only checks with robust inline checks on classes/class_teachers.

BEGIN;

-- ==========================================
-- 1. classes table
-- ==========================================
DROP POLICY IF EXISTS "Teachers can manage own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view shared classes" ON public.classes;

CREATE POLICY "Teachers can manage own classes" ON public.classes
  FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view shared classes" ON public.classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_teachers ct
      WHERE ct.class_id = classes.id AND ct.teacher_id = auth.uid()
    )
  );


-- ==========================================
-- 2. students table
-- ==========================================
DROP POLICY IF EXISTS "Teachers can view class students" ON public.students;

CREATE POLICY "Teachers can view class students" ON public.students
  FOR SELECT
  USING (
    public.get_class_teacher_id(students.class_id) = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_teachers ct
      WHERE ct.class_id = students.class_id AND ct.teacher_id = auth.uid()
    )
  );


-- ==========================================
-- 3. profiles table
-- ==========================================
DROP POLICY IF EXISTS "Teachers can view class student profiles" ON public.profiles;

CREATE POLICY "Teachers can view class student profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = profiles.user_id
        AND (
          EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = s.class_id AND c.teacher_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = s.class_id AND ct.teacher_id = auth.uid()
          )
        )
    )
  );


-- ==========================================
-- 4. student_analytics table
-- ==========================================
DROP POLICY IF EXISTS "Teachers view class analytics" ON public.student_analytics;

CREATE POLICY "Teachers view class analytics" ON public.student_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_analytics.student_id
        AND (
          EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = s.class_id AND c.teacher_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = s.class_id AND ct.teacher_id = auth.uid()
          )
        )
    )
  );


-- ==========================================
-- 5. assignments table
-- ==========================================
DROP POLICY IF EXISTS "Teachers can manage own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can view assignments for their classes" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can create assignments for their classes" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can update own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can delete own assignments" ON public.assignments;

-- Teachers can view assignments they created OR assignments for any class they teach/co-teach
CREATE POLICY "Teachers can view assignments for their classes" ON public.assignments
  FOR SELECT
  USING (
    auth.uid() = teacher_id
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = assignments.class_id AND c.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.class_teachers ct
      WHERE ct.class_id = assignments.class_id AND ct.teacher_id = auth.uid()
    )
  );

-- Teachers can create assignments for classes they teach/co-teach, setting themselves as the teacher_id
CREATE POLICY "Teachers can create assignments for their classes" ON public.assignments
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update assignments they created, provided they teach/co-teach the class
CREATE POLICY "Teachers can update own assignments" ON public.assignments
  FOR UPDATE
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can delete assignments they created
CREATE POLICY "Teachers can delete own assignments" ON public.assignments
  FOR DELETE
  USING (auth.uid() = teacher_id);


-- ==========================================
-- 6. student_assignments table
-- ==========================================
DROP POLICY IF EXISTS "Teachers can view class submissions" ON public.student_assignments;
DROP POLICY IF EXISTS "Teachers can update class submissions" ON public.student_assignments;
DROP POLICY IF EXISTS "Teachers can assign to class students" ON public.student_assignments;

-- Teachers can view submissions for assignments in classes they teach/co-teach
CREATE POLICY "Teachers can view class submissions" ON public.student_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = student_assignments.assignment_id
        AND (
          a.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = a.class_id AND ct.teacher_id = auth.uid()
          )
        )
    )
  );

-- Teachers can grade (update) submissions for assignments in classes they teach/co-teach
CREATE POLICY "Teachers can update class submissions" ON public.student_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = student_assignments.assignment_id
        AND (
          a.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = a.class_id AND ct.teacher_id = auth.uid()
          )
        )
    )
  );

-- Teachers can assign (insert) assignment submissions to students in classes they teach/co-teach
CREATE POLICY "Teachers can assign to class students" ON public.student_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id
        AND (
          a.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = a.class_id AND ct.teacher_id = auth.uid()
          )
        )
    )
  );


-- ==========================================
-- 7. discussion_rooms table
-- ==========================================
DROP POLICY IF EXISTS "Class members can view discussion rooms" ON public.discussion_rooms;

CREATE POLICY "Class members can view discussion rooms" ON public.discussion_rooms
  FOR SELECT
  USING (
    class_id IS NOT NULL
    AND (
      class_id = public.get_student_class_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = class_id AND c.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.class_teachers ct
        WHERE ct.class_id = class_id AND ct.teacher_id = auth.uid()
      )
    )
  );


-- ==========================================
-- 8. discussion_messages table
-- ==========================================
DROP POLICY IF EXISTS "Class members can view discussion messages" ON public.discussion_messages;
DROP POLICY IF EXISTS "Class members can send discussion messages" ON public.discussion_messages;

CREATE POLICY "Class members can view discussion messages" ON public.discussion_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discussion_rooms r
      WHERE r.id = discussion_messages.room_id
        AND r.class_id IS NOT NULL
        AND (
          r.class_id = public.get_student_class_id(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = r.class_id AND c.teacher_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = r.class_id AND ct.teacher_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Class members can send discussion messages" ON public.discussion_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.discussion_rooms r
      WHERE r.id = discussion_messages.room_id
        AND r.class_id IS NOT NULL
        AND (
          r.class_id = public.get_student_class_id(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = r.class_id AND c.teacher_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = r.class_id AND ct.teacher_id = auth.uid()
          )
        )
    )
  );

COMMIT;
