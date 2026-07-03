-- Migration: Add School Multi-Tenancy and Super Admin God-Mode bypass
-- Schema: public

BEGIN;

-- =========================================================================
-- 1. Create School Tenants Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    school_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow anyone with a valid session to view school list (for dropdown sign-up selection)
CREATE POLICY "Allow authenticated read on schools" ON public.schools
    FOR SELECT
    TO authenticated
    USING (true);

-- Manage policy: Allow super_admin to manage schools
CREATE POLICY "Allow super_admin all on schools" ON public.schools
    FOR ALL
    USING (
        (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'super_admin'
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'super_admin'
    );


-- =========================================================================
-- 2. Inject school_id into existing tables
-- =========================================================================

-- Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- Classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- Students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- Attendance Records
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- Class Schedules
ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- Fee Bills
ALTER TABLE public.fee_bills ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;


-- =========================================================================
-- 3. Helper function to check if active user is a Super Admin
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 4. Update RLS policies with Super Admin Bypass and School Isolation
-- =========================================================================

-- ----------------------------------------------------
-- A. classes table
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Teachers can manage own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view shared classes" ON public.classes;

-- Super Admin: full access
CREATE POLICY "Super admins can manage all classes" ON public.classes
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- School-isolated read: Teacher, student, parent within school
CREATE POLICY "Read classes in own school" ON public.classes
    FOR SELECT
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- School-isolated write: Main class teacher or co-teachers
CREATE POLICY "Write classes in own school" ON public.classes
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        AND (
            auth.uid() = teacher_id
            OR EXISTS (
                SELECT 1 FROM public.class_teachers ct
                WHERE ct.class_id = id AND ct.teacher_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        AND (
            auth.uid() = teacher_id
            OR EXISTS (
                SELECT 1 FROM public.class_teachers ct
                WHERE ct.class_id = id AND ct.teacher_id = auth.uid()
            )
        )
    );

-- ----------------------------------------------------
-- B. students table
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Teachers can view class students" ON public.students;
DROP POLICY IF EXISTS "Students can view own details" ON public.students;
DROP POLICY IF EXISTS "Parents can view child details" ON public.students;

CREATE POLICY "Super admins can manage all students" ON public.students
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can read students in own school" ON public.students
    FOR SELECT
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Students and parents can update details" ON public.students
    FOR UPDATE
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.parent_students ps
                WHERE ps.student_id = id AND ps.parent_id = auth.uid()
            )
        )
    );

-- ----------------------------------------------------
-- C. profiles table
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can read profiles in own school" ON public.profiles
    FOR SELECT
    USING (
        school_id = profiles.school_id
        OR school_id IS NULL
        OR profiles.school_id IS NULL
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------
-- D. attendance_records table
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Parents can view child attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can view class attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can manage class attendance" ON public.attendance_records;

CREATE POLICY "Super admins can manage all attendance" ON public.attendance_records
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Read attendance in own school" ON public.attendance_records
    FOR SELECT
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Write attendance in own school" ON public.attendance_records
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        AND (
            public.get_class_teacher_id(class_id) = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.class_teachers ct
                WHERE ct.class_id = class_id AND ct.teacher_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        AND (
            public.get_class_teacher_id(class_id) = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.class_teachers ct
                WHERE ct.class_id = class_id AND ct.teacher_id = auth.uid()
            )
        )
    );

-- ----------------------------------------------------
-- E. class_schedules table
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Students can view class schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Parents can view child class schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Teachers can view schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Teachers can manage schedules" ON public.class_schedules;

CREATE POLICY "Super admins can manage all schedules" ON public.class_schedules
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Read schedules in own school" ON public.class_schedules
    FOR SELECT
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Write schedules in own school" ON public.class_schedules
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        AND (
            public.get_class_teacher_id(class_id) = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.class_teachers ct
                WHERE ct.class_id = class_id AND ct.teacher_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        AND (
            public.get_class_teacher_id(class_id) = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.class_teachers ct
                WHERE ct.class_id = class_id AND ct.teacher_id = auth.uid()
            )
        )
    );

-- ----------------------------------------------------
-- F. fee_bills table
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Students can view own bills" ON public.fee_bills;
DROP POLICY IF EXISTS "Parents can view child bills" ON public.fee_bills;
DROP POLICY IF EXISTS "Teachers can view bills" ON public.fee_bills;
DROP POLICY IF EXISTS "Teachers can manage bills" ON public.fee_bills;

CREATE POLICY "Super admins can manage all bills" ON public.fee_bills
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Read bills in own school" ON public.fee_bills
    FOR SELECT
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Write bills in own school" ON public.fee_bills
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- ----------------------------------------------------
-- G. fee_payments table
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Students can view own payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Parents can view child payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Teachers can view payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Parents can insert payments" ON public.fee_payments;

CREATE POLICY "Super admins can manage all payments" ON public.fee_payments
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Read payments in own school" ON public.fee_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.fee_bills fb
            WHERE fb.id = fee_payments.bill_id
            AND fb.school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Write payments in own school" ON public.fee_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.fee_bills fb
            WHERE fb.id = fee_payments.bill_id
            AND fb.school_id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid())
        )
    );

COMMIT;
