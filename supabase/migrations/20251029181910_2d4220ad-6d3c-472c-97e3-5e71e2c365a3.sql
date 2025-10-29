-- Allow admins to update created_by column in profiles
CREATE POLICY "Admins can update created_by in profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));