-- Remover a chave estrangeira existente de user_instances.user_id para auth.users ou profiles, se existir
ALTER TABLE public.user_instances DROP CONSTRAINT IF EXISTS user_instances_user_id_fkey;

-- Adicionar uma nova chave estrangeira de user_instances.user_id para public.profiles.id
ALTER TABLE public.user_instances
ADD CONSTRAINT user_instances_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;