-- =========================================================================
-- DATABASE SCHEMA UPDATES FOR YEAR AND SECTION SEGREGATION
-- Execute these SQL statements inside your Supabase Project's SQL Editor
-- (https://supabase.com/dashboard/project/_/sql)
-- =========================================================================

-- 1. Alter public.profiles table to add the student section column
-- (Restricted to A or B for 2nd Year students, and NULL for 3rd Year students)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS section VARCHAR(10) CHECK (section IN ('A', 'B'));

-- 2. Alter public.tasks table to add the section column
-- (Exercises can be assigned to 'A', 'B', 'All', 'CAI', or 'CSD', or NULL)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS section VARCHAR(10);

ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_section_check;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_section_check CHECK (section IN ('A', 'B', 'All', 'CAI', 'CSD'));

-- 3. Alter public.profiles table to add overall grades columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS overall_quiz_score NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS overall_coding_score NUMERIC DEFAULT 0.0;
