-- Ensure late-joining students receive existing class assignments

BEGIN;

-- When a student joins a class (students.class_id set), backfill missing student_assignments.
CREATE OR REPLACE FUNCTION public.backfill_student_assignments_on_class_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Only when class_id is set/changed to a non-null value.
  IF NEW.class_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.class_id IS NOT DISTINCT FROM NEW.class_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.student_assignments (assignment_id, student_id, status)
  SELECT a.id, NEW.id, 'pending'
  FROM public.assignments a
  WHERE a.class_id = NEW.class_id
  ON CONFLICT (assignment_id, student_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backfill_student_assignments_on_class_join ON public.students;
CREATE TRIGGER trg_backfill_student_assignments_on_class_join
AFTER INSERT OR UPDATE OF class_id ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.backfill_student_assignments_on_class_join();

-- When a teacher creates an assignment for a class, ensure all current class students receive it.
-- This complements the frontend insert logic and keeps the DB consistent.
CREATE OR REPLACE FUNCTION public.backfill_student_assignments_on_assignment_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.class_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.student_assignments (assignment_id, student_id, status)
  SELECT NEW.id, s.id, 'pending'
  FROM public.students s
  WHERE s.class_id = NEW.class_id
  ON CONFLICT (assignment_id, student_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backfill_student_assignments_on_assignment_create ON public.assignments;
CREATE TRIGGER trg_backfill_student_assignments_on_assignment_create
AFTER INSERT ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.backfill_student_assignments_on_assignment_create();

COMMIT;
