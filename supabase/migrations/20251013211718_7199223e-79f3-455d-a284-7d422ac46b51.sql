-- Criar tabela de configurações de webhooks
CREATE TABLE public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, type)
);

-- Habilitar RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para webhook_configs
CREATE POLICY "Users can view their own webhook configs"
  ON public.webhook_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook configs"
  ON public.webhook_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook configs"
  ON public.webhook_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook configs"
  ON public.webhook_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Criar tabela de histórico de webhooks
CREATE TABLE public.webhook_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.webhook_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para webhook_history
CREATE POLICY "Users can view their own webhook history"
  ON public.webhook_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook history"
  ON public.webhook_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at em webhook_configs
CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON public.webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de status de conexão
CREATE TABLE public.connection_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code_base64 TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, instance_name)
);

-- Habilitar RLS
ALTER TABLE public.connection_status ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para connection_status
CREATE POLICY "Users can view their own connection status"
  ON public.connection_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connection status"
  ON public.connection_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connection status"
  ON public.connection_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connection status"
  ON public.connection_status FOR DELETE
  USING (auth.uid() = user_id);

-- Habilitar Realtime para connection_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_status;