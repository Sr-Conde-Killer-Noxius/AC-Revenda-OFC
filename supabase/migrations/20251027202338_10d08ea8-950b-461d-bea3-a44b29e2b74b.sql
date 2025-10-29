-- Criar tabela de planos
CREATE TABLE public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela planos
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura de planos para usuários autenticados
CREATE POLICY "Usuários autenticados podem visualizar planos"
ON public.planos
FOR SELECT
TO authenticated
USING (true);

-- Criar política para permitir masters gerenciar planos
CREATE POLICY "Masters podem inserir planos"
ON public.planos
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'master'));

CREATE POLICY "Masters podem atualizar planos"
ON public.planos
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'master'));

CREATE POLICY "Masters podem deletar planos"
ON public.planos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'master'));

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_planos_updated_at
BEFORE UPDATE ON public.planos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Renomear e modificar coluna plan na tabela profiles
ALTER TABLE public.profiles 
RENAME COLUMN plan TO plan_id;

ALTER TABLE public.profiles 
ALTER COLUMN plan_id TYPE UUID USING NULL;

-- Adicionar foreign key
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_plan_id
FOREIGN KEY (plan_id)
REFERENCES public.planos(id)
ON DELETE SET NULL;