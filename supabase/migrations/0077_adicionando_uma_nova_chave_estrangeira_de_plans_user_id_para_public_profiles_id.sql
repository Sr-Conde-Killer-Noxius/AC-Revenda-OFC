ALTER TABLE public.plans
ADD CONSTRAINT plans_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;