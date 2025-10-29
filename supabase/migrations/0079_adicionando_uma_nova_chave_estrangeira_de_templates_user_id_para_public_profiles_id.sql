ALTER TABLE public.templates
ADD CONSTRAINT templates_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;