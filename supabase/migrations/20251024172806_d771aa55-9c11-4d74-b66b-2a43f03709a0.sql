-- Add reseller_role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN reseller_role text CHECK (reseller_role IN ('master', 'reseller'));

-- Create index for better query performance
CREATE INDEX idx_profiles_reseller_role ON public.profiles(reseller_role);

-- Update RLS policies to allow masters to view all profiles with reseller roles
CREATE POLICY "Masters can view all reseller profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND reseller_role = 'master'
    )
    OR auth.uid() = user_id
  );