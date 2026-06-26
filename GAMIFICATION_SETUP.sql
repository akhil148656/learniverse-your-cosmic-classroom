-- GAMIFICATION_SETUP.sql
-- Run this script in your Supabase SQL Editor to persist streaks and avatars to the database!

-- Add new columns for tracking gamification in the students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_active_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS selected_avatar TEXT DEFAULT 'cadet',
ADD COLUMN IF NOT EXISTS unlocked_avatars TEXT[] DEFAULT ARRAY['cadet'];

-- Enable RLS updates for these specific columns if they are not already covered
-- The existing update policy for students is usually:
-- "Students can update their own profile" or similar.
-- Let's verify that students can write to their own row in the students table.
