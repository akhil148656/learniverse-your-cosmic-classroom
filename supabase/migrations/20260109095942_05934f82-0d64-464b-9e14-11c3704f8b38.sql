-- Learniverse Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'parent');

-- User roles table (for security - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Classes table (for teachers)
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_code TEXT NOT NULL UNIQUE,
  grade_level INTEGER CHECK (grade_level >= 6 AND grade_level <= 12),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  grade_level INTEGER CHECK (grade_level >= 6 AND grade_level <= 12),
  learning_mode TEXT DEFAULT 'individual' CHECK (learning_mode IN ('classroom', 'individual')),
  xp_points INTEGER DEFAULT 0,
  focus_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parent-Student relationship
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  grade_level INTEGER CHECK (grade_level >= 6 AND grade_level <= 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student Assignments (submissions)
CREATE TABLE public.student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed')),
  score INTEGER,
  submission_text TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  teacher_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  time_limit_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz Questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz Attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mode TEXT DEFAULT 'solo' CHECK (mode IN ('solo', 'classmate', 'ai')),
  score INTEGER,
  accuracy DECIMAL(5,2),
  time_taken_seconds INTEGER,
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Virtual Labs table
CREATE TABLE public.virtual_labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  lab_type TEXT CHECK (lab_type IN ('physics', 'chemistry', 'biology', 'geography')),
  config JSONB,
  is_locked BOOLEAN DEFAULT true,
  unlock_condition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student Lab Progress
CREATE TABLE public.student_lab_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.virtual_labs(id) ON DELETE CASCADE,
  is_unlocked BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  progress_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, lab_id)
);

-- Discussion Rooms table
CREATE TABLE public.discussion_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  max_participants INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discussion Messages table
CREATE TABLE public.discussion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.discussion_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_ai_response BOOLEAN DEFAULT false,
  is_teacher_tagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student Analytics table
CREATE TABLE public.student_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  topics_completed INTEGER DEFAULT 0,
  quizzes_attempted INTEGER DEFAULT 0,
  quizzes_passed INTEGER DEFAULT 0,
  total_marks INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  focus_score INTEGER DEFAULT 100,
  distraction_count INTEGER DEFAULT 0,
  study_time_minutes INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Learning Suggestions table (AI-generated)
CREATE TABLE public.learning_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  suggestion_text TEXT NOT NULL,
  reason TEXT,
  priority INTEGER DEFAULT 1,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'alert')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Feedback table
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  category TEXT CHECK (category IN ('performance', 'focus', 'engagement', 'suggestion')),
  parent_reaction TEXT CHECK (parent_reaction IN ('happy', 'neutral', 'concerned')),
  parent_acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Search History table
CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- User roles: users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Profiles: users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Classes: teachers can manage their classes, students can view their class
CREATE POLICY "Teachers can manage classes" ON public.classes
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view their class" ON public.classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE user_id = auth.uid() AND class_id = classes.id)
  );

-- Students: users can view/update their own student record
CREATE POLICY "Users can view own student record" ON public.students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own student record" ON public.students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own student record" ON public.students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Teachers can view students in their classes
CREATE POLICY "Teachers can view class students" ON public.students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.classes WHERE teacher_id = auth.uid() AND id = students.class_id)
  );

-- Subjects and Topics: readable by all authenticated users
CREATE POLICY "Subjects readable by all" ON public.subjects
  FOR SELECT USING (true);

CREATE POLICY "Topics readable by all" ON public.topics
  FOR SELECT USING (true);

-- Assignments: teachers can manage, students can view their class assignments
CREATE POLICY "Teachers can manage assignments" ON public.assignments
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view class assignments" ON public.assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE user_id = auth.uid() AND class_id = assignments.class_id)
  );

-- Student Assignments: students can manage their own
CREATE POLICY "Students can manage own submissions" ON public.student_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = student_assignments.student_id AND user_id = auth.uid())
  );

CREATE POLICY "Teachers can view class submissions" ON public.student_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON a.class_id = c.id
      WHERE a.id = student_assignments.assignment_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update class submissions" ON public.student_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON a.class_id = c.id
      WHERE a.id = student_assignments.assignment_id AND c.teacher_id = auth.uid()
    )
  );

-- Quizzes and questions: readable by all
CREATE POLICY "Quizzes readable by all" ON public.quizzes
  FOR SELECT USING (true);

CREATE POLICY "Quiz questions readable by all" ON public.quiz_questions
  FOR SELECT USING (true);

-- Quiz attempts: students manage their own
CREATE POLICY "Students manage own quiz attempts" ON public.quiz_attempts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = quiz_attempts.student_id AND user_id = auth.uid())
  );

-- Virtual labs: readable by all
CREATE POLICY "Labs readable by all" ON public.virtual_labs
  FOR SELECT USING (true);

-- Student lab progress: students manage their own
CREATE POLICY "Students manage own lab progress" ON public.student_lab_progress
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = student_lab_progress.student_id AND user_id = auth.uid())
  );

-- Discussion rooms and messages
CREATE POLICY "Discussion rooms viewable by class members" ON public.discussion_rooms
  FOR SELECT USING (true);

CREATE POLICY "Messages viewable in rooms" ON public.discussion_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can send messages" ON public.discussion_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Student analytics: students view their own, teachers view their class
CREATE POLICY "Students view own analytics" ON public.student_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = student_analytics.student_id AND user_id = auth.uid())
  );

CREATE POLICY "Students can manage own analytics" ON public.student_analytics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = student_analytics.student_id AND user_id = auth.uid())
  );

CREATE POLICY "Teachers view class analytics" ON public.student_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = student_analytics.student_id AND c.teacher_id = auth.uid()
    )
  );

-- Learning suggestions: students view their own
CREATE POLICY "Students view own suggestions" ON public.learning_suggestions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = learning_suggestions.student_id AND user_id = auth.uid())
  );

CREATE POLICY "Students can update own suggestions" ON public.learning_suggestions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = learning_suggestions.student_id AND user_id = auth.uid())
  );

-- Notifications: users view their own
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- AI Feedback: parents can view their children's feedback
CREATE POLICY "Parents view child feedback" ON public.ai_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.parent_id = auth.uid() AND ps.student_id = ai_feedback.student_id
    )
  );

CREATE POLICY "Parents can update feedback reactions" ON public.ai_feedback
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.parent_id = auth.uid() AND ps.student_id = ai_feedback.student_id
    )
  );

-- Search history: students manage their own
CREATE POLICY "Students manage own search history" ON public.search_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = search_history.student_id AND user_id = auth.uid())
  );

-- Parent students: parents can view their links
CREATE POLICY "Parents view own student links" ON public.parent_students
  FOR SELECT USING (auth.uid() = parent_id);

-- Insert seed data for subjects
INSERT INTO public.subjects (name, icon, color) VALUES
  ('Physics', 'atom', 'hsl(270, 95%, 65%)'),
  ('Chemistry', 'flask-conical', 'hsl(150, 80%, 45%)'),
  ('Biology', 'leaf', 'hsl(120, 60%, 50%)'),
  ('Mathematics', 'calculator', 'hsl(200, 80%, 50%)'),
  ('Geography', 'globe', 'hsl(45, 100%, 50%)'),
  ('History', 'scroll', 'hsl(30, 70%, 50%)'),
  ('English', 'book-open', 'hsl(320, 90%, 60%)'),
  ('Computer Science', 'laptop', 'hsl(180, 70%, 45%)');