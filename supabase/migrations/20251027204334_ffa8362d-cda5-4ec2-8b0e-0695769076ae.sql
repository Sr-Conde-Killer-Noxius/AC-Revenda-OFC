-- Criar tabela webhook_configs para armazenar URLs dos webhooks do n8n
CREATE TABLE public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Políticas: Apenas masters podem gerenciar
CREATE POLICY "Masters podem visualizar webhook configs"
ON public.webhook_configs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'master'));

CREATE POLICY "Masters podem inserir webhook configs"
ON public.webhook_configs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'master'));

CREATE POLICY "Masters podem atualizar webhook configs"
ON public.webhook_configs
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'master'));

CREATE POLICY "Masters podem deletar webhook configs"
ON public.webhook_configs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'master'));

-- Criar tabela user_instances para instâncias do WhatsApp
CREATE TABLE public.user_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL UNIQUE,
  connection_status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code_base64 TEXT,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS e Realtime
ALTER TABLE public.user_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_instances REPLICA IDENTITY FULL;

-- Políticas
CREATE POLICY "Usuários podem ver sua própria instância"
ON public.user_instances
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Masters podem ver todas as instâncias"
ON public.user_instances
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'master'));

CREATE POLICY "Usuários podem inserir sua própria instância"
ON public.user_instances
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar sua própria instância"
ON public.user_instances
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Criar tabela evolution_api_history
CREATE TABLE public.evolution_api_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status_code INTEGER,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.evolution_api_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters podem ver histórico da Evolution API"
ON public.evolution_api_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'master'));

-- Criar tabela n8n_qr_code_history
CREATE TABLE public.n8n_qr_code_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  request_payload JSONB,
  response_status INTEGER,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.n8n_qr_code_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio histórico QR"
ON public.n8n_qr_code_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Masters podem ver todo histórico QR"
ON public.n8n_qr_code_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'master'));

-- Criar tabela evolution_logout_history
CREATE TABLE public.evolution_logout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  request_payload JSONB,
  response_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.evolution_logout_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio histórico logout"
ON public.evolution_logout_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Masters podem ver todo histórico logout"
ON public.evolution_logout_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'master'));

-- Criar tabela n8n_message_sender_history
CREATE TABLE public.n8n_message_sender_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  request_payload JSONB,
  response_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.n8n_message_sender_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio histórico de mensagens"
ON public.n8n_message_sender_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Masters podem ver todo histórico de mensagens"
ON public.n8n_message_sender_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'master'));

-- Adicionar triggers para updated_at
CREATE TRIGGER update_webhook_configs_updated_at
BEFORE UPDATE ON public.webhook_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_instances_updated_at
BEFORE UPDATE ON public.user_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();