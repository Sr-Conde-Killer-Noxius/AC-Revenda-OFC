-- Drop existing policies on profiles FIRST (before dropping functions)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- NOW drop old security definer functions
DROP FUNCTION IF EXISTS public.get_user_reseller_role(uuid);
DROP FUNCTION IF EXISTS public.is_master(uuid);

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('master', 'reseller');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add created_by column to profiles to track who created each reseller
ALTER TABLE public.profiles ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Migrate existing reseller_role data to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, reseller_role::app_role
FROM public.profiles
WHERE reseller_role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove reseller_role column from profiles (no longer needed)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS reseller_role;

-- Create new security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create new policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Masters can view profiles they created
CREATE POLICY "Masters can view profiles they created"
  ON public.profiles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'master') 
    AND auth.uid() = created_by
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policies for user_roles
-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Masters can view roles (for checking permissions)
CREATE POLICY "Masters can view roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'master'));

-- Trigger for updating updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT USAGE ON TYPE public.app_role TO authenticated;