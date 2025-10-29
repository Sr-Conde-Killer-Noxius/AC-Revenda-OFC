-- Tabela 1: Fila de envios pendentes
-- Esta tabela irá conter todas as mensagens que estão agendadas para serem enviadas.
CREATE TABLE public.pending_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  scheduled_for DATE NOT NULL, -- Data exata para a qual o envio está agendado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Garante que não haja agendamentos duplicados para o mesmo cliente na mesma data pela mesma regra
  UNIQUE(client_id, automation_id, scheduled_for) 
);

-- Habilitar Row Level Security
ALTER TABLE public.pending_sends ENABLE ROW LEVEL SECURITY;
-- Políticas: Utilizadores só podem ver e gerir os seus próprios envios pendentes
CREATE POLICY "Users can manage their own pending sends" 
ON public.pending_sends FOR ALL USING (auth.uid() = user_id);


-- Tabela 2: Histórico de envios
-- Esta tabela é um log de todas as tentativas de envio, bem-sucedidas ou não.
CREATE TABLE public.send_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')), -- Status final do envio
  error_message TEXT -- Opcional: para armazenar a razão da falha
);

-- Habilitar Row Level Security
ALTER TABLE public.send_history ENABLE ROW LEVEL SECURITY;
-- Políticas: Utilizadores só podem ver o seu próprio histórico
CREATE POLICY "Users can view their own send history" 
ON public.send_history FOR SELECT USING (auth.uid() = user_id);