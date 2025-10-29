-- Tabela para armazenar as regras de envio automático
CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  days_offset INT NOT NULL, -- Ex: -3 (3 dias antes), 0 (no dia), 1 (1 dia depois)
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  client_ids UUID[] NOT NULL, -- Array de IDs de clientes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança: Utilizadores só podem gerir as suas próprias automações
CREATE POLICY "Users can manage their own automations" 
ON public.automations FOR ALL USING (auth.uid() = user_id);

-- Trigger para atualizar 'updated_at'
CREATE TRIGGER update_automations_updated_at 
BEFORE UPDATE ON public.automations 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();