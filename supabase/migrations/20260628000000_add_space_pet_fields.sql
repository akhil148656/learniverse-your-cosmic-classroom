-- Migration: add space pet fields to the students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS cosmic_coins INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS selected_pet TEXT DEFAULT 'spacedog',
ADD COLUMN IF NOT EXISTS pet_name TEXT DEFAULT 'Cosmo',
ADD COLUMN IF NOT EXISTS unlocked_accessories TEXT[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS equipped_accessories TEXT[] DEFAULT ARRAY[]::text[];
