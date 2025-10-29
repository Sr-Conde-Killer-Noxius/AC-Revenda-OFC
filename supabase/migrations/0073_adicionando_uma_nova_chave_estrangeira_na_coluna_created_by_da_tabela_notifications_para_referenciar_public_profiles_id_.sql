ALTER TABLE public.notifications ADD CONSTRAINT notifications_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;