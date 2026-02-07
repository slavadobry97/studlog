-- ============================================
-- RLS Policies for profiles table
-- ============================================
-- This script sets up Row Level Security policies for the profiles table
-- to allow users to read their own profile and admins to manage all profiles

-- First, enable RLS on the profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during sign up" ON public.profiles;

-- ============================================
-- SELECT Policies
-- ============================================

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Admins and Moderators can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Администратор', 'Модератор')
  )
);

-- ============================================
-- INSERT Policy: Allow profile creation during sign up
-- ============================================
CREATE POLICY "Enable insert for authenticated users during sign up"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- UPDATE Policies
-- ============================================

-- Policy 1: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 2: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Администратор'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Администратор'
  )
);

-- ============================================
-- Optional: Create an index for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- ============================================
-- Verify policies
-- ============================================
-- You can verify the policies by running:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
