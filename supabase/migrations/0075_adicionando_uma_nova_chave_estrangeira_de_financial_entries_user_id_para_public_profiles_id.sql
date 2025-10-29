ALTER TABLE public.financial_entries
ADD CONSTRAINT financial_entries_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;