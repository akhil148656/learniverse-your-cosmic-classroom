-- Create automatic notifications when assignments are assigned and graded

BEGIN;

-- Notify teacher when an assignment is created
CREATE OR REPLACE FUNCTION public._notify_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.teacher_id,
    'Assignment created',
    '"' || NEW.title || '" was created and can be assigned to students.',
    'success',
    '/teacher/assignments'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_created ON public.assignments;
CREATE TRIGGER trg_notify_assignment_created
AFTER INSERT ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public._notify_assignment_created();


-- Notify student when a student_assignment row is created (assignment given)
CREATE OR REPLACE FUNCTION public._notify_student_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  assignment_title TEXT;
  student_user_id UUID;
BEGIN
  SELECT a.title INTO assignment_title
  FROM public.assignments a
  WHERE a.id = NEW.assignment_id;

  SELECT s.user_id INTO student_user_id
  FROM public.students s
  WHERE s.id = NEW.student_id;

  IF student_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      student_user_id,
      'New assignment',
      COALESCE('You have a new assignment: "' || assignment_title || '"', 'You have a new assignment.'),
      'info',
      '/student/assignments'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_assignment_created ON public.student_assignments;
CREATE TRIGGER trg_notify_student_assignment_created
AFTER INSERT ON public.student_assignments
FOR EACH ROW
EXECUTE FUNCTION public._notify_student_assignment_created();


-- Notify student + teacher when an assignment is graded (status changes to reviewed)
CREATE OR REPLACE FUNCTION public._notify_student_assignment_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  assignment_title TEXT;
  teacher_id UUID;
  max_score INTEGER;
  student_user_id UUID;
  student_name TEXT;
  score_text TEXT;
BEGIN
  IF NOT (NEW.status = 'reviewed' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
    RETURN NEW;
  END IF;

  SELECT a.title, a.teacher_id, COALESCE(a.max_score, 100)
    INTO assignment_title, teacher_id, max_score
  FROM public.assignments a
  WHERE a.id = NEW.assignment_id;

  SELECT s.user_id INTO student_user_id
  FROM public.students s
  WHERE s.id = NEW.student_id;

  SELECT p.full_name INTO student_name
  FROM public.students s
  JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.id = NEW.student_id;

  score_text := CASE
    WHEN NEW.score IS NULL THEN ''
    ELSE ' Score: ' || NEW.score::TEXT || '/' || max_score::TEXT || '.'
  END;

  IF student_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      student_user_id,
      'Assignment graded',
      'Your assignment "' || COALESCE(assignment_title, 'Assignment') || '" was graded.' || score_text,
      'success',
      '/student/assignments'
    );
  END IF;

  IF teacher_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      teacher_id,
      'Grading submitted',
      'You graded ' || COALESCE(student_name, 'a student') || ' for "' || COALESCE(assignment_title, 'Assignment') || '".' || score_text,
      'info',
      '/teacher/grading'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_assignment_graded ON public.student_assignments;
CREATE TRIGGER trg_notify_student_assignment_graded
AFTER UPDATE OF status ON public.student_assignments
FOR EACH ROW
EXECUTE FUNCTION public._notify_student_assignment_graded();

COMMIT;
