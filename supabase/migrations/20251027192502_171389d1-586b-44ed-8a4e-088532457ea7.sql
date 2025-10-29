-- Drop existing problematic policies
DROP POLICY IF EXISTS "Masters can view all reseller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a security definer function to check reseller role
CREATE OR REPLACE FUNCTION public.get_user_reseller_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT reseller_role
  FROM public.profiles
  WHERE profiles.user_id = $1
  LIMIT 1;
$$;

-- Create a security definer function to check if user is master
CREATE OR REPLACE FUNCTION public.is_master(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = $1
      AND profiles.reseller_role = 'master'
  );
$$;

-- Create new policies using the security definer functions
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Masters can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_master(auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.get_user_reseller_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated;