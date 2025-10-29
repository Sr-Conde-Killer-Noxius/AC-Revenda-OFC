-- Remover a política de inserção existente para perfis
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Criar uma nova política de inserção para perfis usando uma subquery para auth.uid()
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));