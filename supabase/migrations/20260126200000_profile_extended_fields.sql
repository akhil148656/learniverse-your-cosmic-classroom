-- Extended profile fields for Teacher and Parent portals
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS subject_specialization TEXT,
  ADD COLUMN IF NOT EXISTS relationship_to_child TEXT
    CHECK (relationship_to_child IN ('Father', 'Mother', 'Guardian', 'Other')),
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Parents can also update their extended fields (policy already covers all columns via
-- the existing "Users can update own profile" policy).

COMMIT;
