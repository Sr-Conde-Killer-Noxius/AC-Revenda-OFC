DROP POLICY IF EXISTS "Allow authenticated users to read their own, standard, or globa" ON public.templates;

CREATE POLICY "Allow authenticated users to read their own, standard, or global, and admins to read all" ON public.templates
FOR SELECT TO authenticated
USING (
    (auth.uid() = user_id) OR
    (user_id IS NULL) OR
    (type = 'global'::template_type) OR
    (EXISTS ( SELECT 1 FROM public.user_roles WHERE (user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role)))
);