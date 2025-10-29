-- Criar tabela de templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  assunto TEXT,
  corpo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'global',
  user_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura de templates para usuários autenticados
CREATE POLICY "Usuários autenticados podem visualizar templates"
ON public.templates
FOR SELECT
TO authenticated
USING (true);

-- Criar política para permitir masters criar templates
CREATE POLICY "Masters podem inserir templates"
ON public.templates
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'master'));

-- Criar política para permitir masters atualizar templates
CREATE POLICY "Masters podem atualizar templates"
ON public.templates
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'master'));

-- Criar política para permitir masters deletar templates
CREATE POLICY "Masters podem deletar templates"
ON public.templates
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'master'));

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();