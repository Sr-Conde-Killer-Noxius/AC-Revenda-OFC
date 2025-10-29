-- Remover políticas RLS existentes na tabela user_roles para evitar recursão infinita
DROP POLICY IF EXISTS "Users can view their own roles OR Admins can view all" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Criar política RLS para SELECT: Usuários podem ver apenas seu próprio papel
CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Criar política RLS para INSERT, UPDATE, DELETE: Usuários podem gerenciar apenas seu próprio papel
CREATE POLICY "Users can manage their own role" ON public.user_roles
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Opcional: Se você precisa que administradores vejam *todos* os papéis via RLS no frontend,
-- e não apenas através de funções de backend com service_role, você precisaria de uma função
-- SECURITY INVOKER para verificar o papel de admin sem recursão.
-- Por enquanto, a abordagem é que o frontend só busca o próprio papel do usuário,
-- e operações de admin em massa são feitas via backend (Edge Functions com service_role).

-- Backfill: Inserir papel 'user' para usuários existentes que não têm um
INSERT INTO public.user_roles (user_id, role)
SELECT
    au.id,
    'user'::app_role
FROM
    auth.users au
LEFT JOIN
    public.user_roles ur ON au.id = ur.user_id
WHERE
    ur.user_id IS NULL;