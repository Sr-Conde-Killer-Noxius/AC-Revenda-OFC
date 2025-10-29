-- Remover a chave estrangeira existente de subscriptions.user_id para auth.users ou profiles, se existir
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- Adicionar uma nova chave estrangeira de subscriptions.user_id para public.profiles.id
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;