CREATE TABLE scheduled_clashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'active' | 'completed'
  created_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE scheduled_clashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for classmates and teachers" ON scheduled_clashes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students WHERE students.class_id = scheduled_clashes.class_id AND students.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM classes WHERE classes.id = scheduled_clashes.class_id AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Enable write access for teachers" ON scheduled_clashes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = scheduled_clashes.class_id AND classes.teacher_id = auth.uid()
    )
  );
