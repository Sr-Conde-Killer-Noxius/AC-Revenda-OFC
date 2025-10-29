-- Migração: Atualizando as políticas de RLS para a tabela templates

-- Desabilitar RLS temporariamente para remover políticas existentes
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para templates
DROP POLICY IF EXISTS "Users can manage their own templates OR Admins can manage all" ON public.templates;

-- Reabilitar RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Permitir que usuários autenticados leiam seus próprios templates ou templates padrão
CREATE POLICY "Allow authenticated users to read their own or standard templates"
ON public.templates FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- Política INSERT: Permitir que usuários autenticados insiram seus próprios templates
CREATE POLICY "Allow authenticated users to insert their own templates"
ON public.templates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: Permitir que proprietários ou administradores atualizem templates
CREATE POLICY "Allow owners or admins to update templates"
ON public.templates FOR UPDATE TO authenticated
USING (
    (auth.uid() = user_id) OR
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
)
WITH CHECK (
    (auth.uid() = user_id) OR
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- Política DELETE: Permitir que proprietários ou administradores excluam templates
CREATE POLICY "Allow owners or admins to delete templates"
ON public.templates FOR DELETE TO authenticated
USING (
    (auth.uid() = user_id) OR
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);