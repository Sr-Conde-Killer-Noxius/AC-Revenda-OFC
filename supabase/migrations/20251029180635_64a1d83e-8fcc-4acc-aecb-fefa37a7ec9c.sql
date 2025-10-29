-- RLS: allow admins to view all profiles and roles
-- Drop existing policies that may conflict and recreate them
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Admins can view all roles" 
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));