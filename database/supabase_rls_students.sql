-- ============================================
-- RLS Policies for students table
-- ============================================
-- This script sets up Row Level Security policies for the students table
-- to allow administrators and moderators to manage students

-- First, enable RLS on the students table if not already enabled
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow insert for admins and moderators" ON public.students;
DROP POLICY IF EXISTS "Allow update for admins and moderators" ON public.students;
DROP POLICY IF EXISTS "Allow delete for admins and moderators" ON public.students;

-- ============================================
-- SELECT Policy: All authenticated users can read students
-- ============================================
CREATE POLICY "Allow read access for authenticated users"
ON public.students
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- INSERT Policy: Only admins and moderators can add students
-- ============================================
CREATE POLICY "Allow insert for admins and moderators"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Администратор', 'Модератор')
  )
);

-- ============================================
-- UPDATE Policy: Only admins and moderators can update students
-- ============================================
CREATE POLICY "Allow update for admins and moderators"
ON public.students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Администратор', 'Модератор')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Администратор', 'Модератор')
  )
);

-- ============================================
-- DELETE Policy: Only admins can delete students
-- ============================================
CREATE POLICY "Allow delete for admins and moderators"
ON public.students
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Администратор', 'Модератор')
  )
);

-- ============================================
-- Verify policies
-- ============================================
-- You can verify the policies by running:
-- SELECT * FROM pg_policies WHERE tablename = 'students';
