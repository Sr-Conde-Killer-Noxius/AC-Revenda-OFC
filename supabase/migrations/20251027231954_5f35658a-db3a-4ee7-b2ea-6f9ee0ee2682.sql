-- Criar tabela para histórico de webhooks enviados ao Acerto Certo
CREATE TABLE public.acerto_certo_webhook_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL CHECK (event_type IN ('create_user', 'delete_user')),
  target_url TEXT NOT NULL,
  payload JSONB,
  response_status_code INTEGER,
  response_body TEXT,
  revenda_user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.acerto_certo_webhook_history ENABLE ROW LEVEL SECURITY;

-- Política para masters visualizarem o histórico
CREATE POLICY "Masters podem ver histórico de webhooks Acerto Certo"
ON public.acerto_certo_webhook_history
FOR SELECT
USING (has_role(auth.uid(), 'master'::app_role));

-- Índice para melhorar performance nas buscas por data
CREATE INDEX idx_acerto_certo_webhook_history_sent_at ON public.acerto_certo_webhook_history(sent_at DESC);

-- Garantir que existe a configuração do webhook na tabela webhook_configs
-- (inserir apenas se não existir)
INSERT INTO public.webhook_configs (config_key, webhook_url, description)
VALUES (
  'acerto_certo_webhook_url',
  '',
  'URL do webhook listener do sistema Acerto Certo para sincronização de usuários'
)
ON CONFLICT (config_key) DO NOTHING;