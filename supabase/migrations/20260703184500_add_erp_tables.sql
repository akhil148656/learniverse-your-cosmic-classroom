-- Migration: Add School ERP Tables (Attendance, Schedules, and Billing/Payments)
-- Schema: public

BEGIN;

-- =========================================================================
-- 1. ATTENDANCE RECORDS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_date UNIQUE (student_id, date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow students to view their own attendance
CREATE POLICY "Students can view own attendance" ON public.attendance_records
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = attendance_records.student_id AND s.user_id = auth.uid()
        )
    );

-- Select policy: Allow linked parents to view child's attendance
CREATE POLICY "Parents can view child attendance" ON public.attendance_records
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.parent_students ps
            WHERE ps.student_id = attendance_records.student_id AND ps.parent_id = auth.uid()
        )
    );

-- Select policy: Allow class teachers (main or co-teachers) to view class attendance
CREATE POLICY "Teachers can view class attendance" ON public.attendance_records
    FOR SELECT
    USING (
        public.get_class_teacher_id(attendance_records.class_id) = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = attendance_records.class_id AND ct.teacher_id = auth.uid()
        )
    );

-- All operations policy: Allow class teachers (main or co-teachers) to manage attendance
CREATE POLICY "Teachers can manage class attendance" ON public.attendance_records
    FOR ALL
    USING (
        public.get_class_teacher_id(attendance_records.class_id) = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = attendance_records.class_id AND ct.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        public.get_class_teacher_id(attendance_records.class_id) = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = attendance_records.class_id AND ct.teacher_id = auth.uid()
        )
    );


-- =========================================================================
-- 2. CLASS SCHEDULES / TIMETABLES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TEXT NOT NULL, -- e.g. "09:00"
    end_time TEXT NOT NULL,   -- e.g. "09:45"
    room_number TEXT,
    teacher_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow students in the class to view class schedules
CREATE POLICY "Students can view class schedules" ON public.class_schedules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.class_id = class_schedules.class_id AND s.user_id = auth.uid()
        )
    );

-- Select policy: Allow linked parents to view child's class schedule
CREATE POLICY "Parents can view child class schedules" ON public.class_schedules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.parent_students ps
            JOIN public.students s ON s.id = ps.student_id
            WHERE s.class_id = class_schedules.class_id AND ps.parent_id = auth.uid()
        )
    );

-- Select policy: Allow class teachers (main or co-teachers) to view schedules
CREATE POLICY "Teachers can view schedules" ON public.class_schedules
    FOR SELECT
    USING (
        public.get_class_teacher_id(class_schedules.class_id) = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = class_schedules.class_id AND ct.teacher_id = auth.uid()
        )
    );

-- All policy: Allow class teachers to manage schedules
CREATE POLICY "Teachers can manage schedules" ON public.class_schedules
    FOR ALL
    USING (
        public.get_class_teacher_id(class_schedules.class_id) = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = class_schedules.class_id AND ct.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        public.get_class_teacher_id(class_schedules.class_id) = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = class_schedules.class_id AND ct.teacher_id = auth.uid()
        )
    );


-- =========================================================================
-- 3. FEE BILLS (Tuition, Activities, Labs)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.fee_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fee_bills ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow students to view their own fee bills
CREATE POLICY "Students can view own bills" ON public.fee_bills
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = fee_bills.student_id AND s.user_id = auth.uid()
        )
    );

-- Select policy: Allow parents to view linked children's fee bills
CREATE POLICY "Parents can view child bills" ON public.fee_bills
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.parent_students ps
            WHERE ps.student_id = fee_bills.student_id AND ps.parent_id = auth.uid()
        )
    );

-- Select policy: Allow teachers/admins to view fee bills
CREATE POLICY "Teachers can view bills" ON public.fee_bills
    FOR SELECT
    USING (
        EXISTS (
            -- If user is a teacher of any class containing the student
            SELECT 1 FROM public.students s
            WHERE s.id = fee_bills.student_id AND (
                public.get_class_teacher_id(s.class_id) = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.class_teachers ct
                    WHERE ct.class_id = s.class_id AND ct.teacher_id = auth.uid()
                )
            )
        )
    );

-- All policy: Allow teachers/admins to manage fee bills
CREATE POLICY "Teachers can manage bills" ON public.fee_bills
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = fee_bills.student_id AND (
                public.get_class_teacher_id(s.class_id) = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.class_teachers ct
                    WHERE ct.class_id = s.class_id AND ct.teacher_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = fee_bills.student_id AND (
                public.get_class_teacher_id(s.class_id) = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.class_teachers ct
                    WHERE ct.class_id = s.class_id AND ct.teacher_id = auth.uid()
                )
            )
        )
    );


-- =========================================================================
-- 4. FEE PAYMENTS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.fee_bills(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'upi', 'bank_transfer', 'cash')),
    transaction_id TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow students to view payments for their bills
CREATE POLICY "Students can view own payments" ON public.fee_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.fee_bills fb
            JOIN public.students s ON s.id = fb.student_id
            WHERE fb.id = fee_payments.bill_id AND s.user_id = auth.uid()
        )
    );

-- Select policy: Allow parents to view payments for their children's bills
CREATE POLICY "Parents can view child payments" ON public.fee_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.fee_bills fb
            JOIN public.parent_students ps ON ps.student_id = fb.student_id
            WHERE fb.id = fee_payments.bill_id AND ps.parent_id = auth.uid()
        )
    );

-- Select policy: Allow teachers/admins to view payments
CREATE POLICY "Teachers can view payments" ON public.fee_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.fee_bills fb
            JOIN public.students s ON s.id = fb.student_id
            WHERE fb.id = fee_payments.bill_id AND (
                public.get_class_teacher_id(s.class_id) = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.class_teachers ct
                    WHERE ct.class_id = s.class_id AND ct.teacher_id = auth.uid()
                )
            )
        )
    );

-- Insert policy: Allow parents to log payments for their children's bills
CREATE POLICY "Parents can insert payments" ON public.fee_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.fee_bills fb
            JOIN public.parent_students ps ON ps.student_id = fb.student_id
            WHERE fb.id = fee_payments.bill_id AND ps.parent_id = auth.uid()
        )
    );

COMMIT;
