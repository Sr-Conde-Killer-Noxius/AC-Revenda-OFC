-- 1. Remover políticas de RLS existentes na tabela public.user_roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- 2. Criar ou substituir a função is_admin() com SECURITY DEFINER
-- Esta função verifica se o usuário atual é um administrador, ignorando RLS para sua própria consulta interna.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
END;
$$;

-- 3. Criar uma nova política de RLS combinada para SELECT na tabela public.user_roles
-- Esta política permite que usuários vejam seu próprio papel OU que administradores vejam todos os papéis.
CREATE POLICY "Allow users to view their own role and admins to view all"
ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin());