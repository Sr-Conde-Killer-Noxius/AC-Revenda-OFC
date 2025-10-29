-- Add user_id column to planos table
ALTER TABLE public.planos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_planos_user_id ON public.planos(user_id);

-- Drop existing RLS policies for planos
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar planos" ON public.planos;
DROP POLICY IF EXISTS "Masters podem inserir planos" ON public.planos;
DROP POLICY IF EXISTS "Masters podem atualizar planos" ON public.planos;
DROP POLICY IF EXISTS "Masters podem deletar planos" ON public.planos;

-- New RLS policies for planos
-- Masters can only see their own plans
CREATE POLICY "Masters podem ver seus próprios planos"
ON public.planos
FOR SELECT
USING (
  public.has_role(auth.uid(), 'master') AND user_id = auth.uid()
);

-- Admins can see all plans
CREATE POLICY "Admins podem ver todos os planos"
ON public.planos
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Masters can create their own plans
CREATE POLICY "Masters podem criar seus próprios planos"
ON public.planos
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'master') AND user_id = auth.uid()
);

-- Admins can create plans for anyone
CREATE POLICY "Admins podem criar planos"
ON public.planos
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Masters can update their own plans
CREATE POLICY "Masters podem atualizar seus próprios planos"
ON public.planos
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'master') AND user_id = auth.uid()
);

-- Admins can update any plan
CREATE POLICY "Admins podem atualizar qualquer plano"
ON public.planos
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Masters can delete their own plans
CREATE POLICY "Masters podem deletar seus próprios planos"
ON public.planos
FOR DELETE
USING (
  public.has_role(auth.uid(), 'master') AND user_id = auth.uid()
);

-- Admins can delete any plan
CREATE POLICY "Admins podem deletar qualquer plano"
ON public.planos
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for templates
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar templates" ON public.templates;
DROP POLICY IF EXISTS "Masters podem inserir templates" ON public.templates;
DROP POLICY IF EXISTS "Masters podem atualizar templates" ON public.templates;
DROP POLICY IF EXISTS "Masters podem deletar templates" ON public.templates;

-- Users can see their own templates or global ones
CREATE POLICY "Usuários podem ver templates próprios ou globais"
ON public.templates
FOR SELECT
USING (
  (auth.uid() = user_id) OR (tipo = 'global')
);

-- Masters and Admins can insert templates
CREATE POLICY "Masters e Admins podem criar templates"
ON public.templates
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin')
);

-- Users can update their own personal templates
CREATE POLICY "Usuários podem atualizar seus templates pessoais"
ON public.templates
FOR UPDATE
USING (
  auth.uid() = user_id AND tipo = 'pessoal'
);

-- Admins can update any template
CREATE POLICY "Admins podem atualizar qualquer template"
ON public.templates
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Users can delete their own personal templates
CREATE POLICY "Usuários podem deletar seus templates pessoais"
ON public.templates
FOR DELETE
USING (
  auth.uid() = user_id AND tipo = 'pessoal'
);

-- Admins can delete any template
CREATE POLICY "Admins podem deletar qualquer template"
ON public.templates
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));