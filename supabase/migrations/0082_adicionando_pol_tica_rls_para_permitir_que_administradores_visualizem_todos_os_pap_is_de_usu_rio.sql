CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));