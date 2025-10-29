-- Criar a tabela scheduled_notifications
CREATE TABLE public.scheduled_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE, -- Adicionado para vincular à automação
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'sent', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (OBRIGATÓRIO para segurança)
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Usuários só podem gerenciar suas próprias tarefas agendadas
CREATE POLICY "Users can view their own scheduled notifications" ON public.scheduled_notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled notifications" ON public.scheduled_notifications
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled notifications" ON public.scheduled_notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled notifications" ON public.scheduled_notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id);