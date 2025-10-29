-- 1. Deletar registros em user_instances onde o user_id não existe em auth.users
-- Isso remove instâncias que apontam para usuários que não existem mais no sistema de autenticação.
DELETE FROM public.user_instances
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 2. Inserir perfis ausentes para user_ids que existem em auth.users mas não em public.profiles
-- Isso garante que todo user_id referenciado em user_instances tenha um perfil correspondente.
INSERT INTO public.profiles (id, name, email)
SELECT
    au.id,
    -- Tenta usar o nome do metadata, senão usa a parte do email antes do '@', senão 'Usuário'
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'Usuário'),
    au.email -- Usa o email do auth.users
FROM auth.users au
WHERE au.id IN (
    SELECT ui.user_id
    FROM public.user_instances ui
    LEFT JOIN public.profiles p ON ui.user_id = p.id
    WHERE p.id IS NULL
)
AND au.id NOT IN (SELECT id FROM public.profiles); -- Evita duplicatas se o perfil já foi criado por outro meio

-- 3. Remover a chave estrangeira existente em user_instances.user_id (se existir)
ALTER TABLE public.user_instances
DROP CONSTRAINT IF EXISTS user_instances_user_id_fkey;

-- 4. Adicionar a nova chave estrangeira em user_instances.user_id referenciando public.profiles.id
ALTER TABLE public.user_instances
ADD CONSTRAINT user_instances_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;