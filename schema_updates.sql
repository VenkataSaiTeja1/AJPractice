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
-- (Exercises can be assigned to 'A', 'B', or 'All' sections, or NULL for 3rd Year tasks)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS section VARCHAR(10) CHECK (section IN ('A', 'B', 'All'));
