-- Adicionar o tipo ENUM 'template_type' se não existir
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_type') THEN
        CREATE TYPE public.template_type AS ENUM ('normal', 'global');
    END IF;
END $$;

-- Adicionar a coluna 'type' à tabela 'templates' se não existir
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'type') THEN
        ALTER TABLE public.templates ADD COLUMN type public.template_type DEFAULT 'normal' NOT NULL;
    END IF;
END $$;

-- Remover políticas RLS antigas para templates
DROP POLICY IF EXISTS "Allow authenticated users to read their own or standard templat" ON public.templates;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own templates" ON public.templates;
DROP POLICY IF EXISTS "Allow owners or admins to update templates" ON public.templates;
DROP POLICY IF EXISTS "Allow owners or admins to delete templates" ON public.templates;

-- Criar novas políticas RLS para templates com base no novo campo 'type' e roles
-- SELECT: Usuários autenticados podem ler seus próprios templates, templates padrão (user_id IS NULL) e templates globais.
CREATE POLICY "Allow authenticated users to read their own, standard, or global templates"
ON public.templates FOR SELECT TO authenticated
USING (
    (auth.uid() = user_id) OR (user_id IS NULL) OR (type = 'global')
);

-- INSERT: Usuários normais podem inserir seus próprios templates 'normal'. Admins podem inserir qualquer tipo.
CREATE POLICY "Allow users to insert normal templates and admins to insert any type"
ON public.templates FOR INSERT TO authenticated
WITH CHECK (
    (auth.uid() = user_id AND type = 'normal') OR
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
);

-- UPDATE: Usuários normais podem atualizar seus próprios templates 'normal'. Admins podem atualizar qualquer tipo.
CREATE POLICY "Allow users to update normal templates and admins to update any type"
ON public.templates FOR UPDATE TO authenticated
USING (
    (auth.uid() = user_id AND type = 'normal') OR
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
)
WITH CHECK (
    (auth.uid() = user_id AND type = 'normal') OR
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
);

-- DELETE: Usuários normais podem deletar seus próprios templates 'normal'. Admins podem deletar qualquer tipo.
CREATE POLICY "Allow users to delete normal templates and admins to delete any type"
ON public.templates FOR DELETE TO authenticated
USING (
    (auth.uid() = user_id AND type = 'normal') OR
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
);