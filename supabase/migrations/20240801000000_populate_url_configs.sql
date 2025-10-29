-- Este script insere a linha de configuração na tabela url_configs.
-- Se a linha com id=1 já existir, ele atualiza os valores (operação idempotente).

INSERT INTO public.url_configs (id, n8n_webhook_url, evolution_listener_url)
VALUES (
  1,
  -- URL do n8n para criar a instância (fornecida pelo utilizador)
  'https://tragic-crayfish-noxius-cyberwork-redes2-f82088fb.koyeb.app/webhook/ffd0c002-d429-48a1-8d0d-101d312497c5',
  -- URL do "ouvinte" (a sua Supabase Function).
  'https://cgqyfpsfymhntumrmbzj.supabase.co/functions/v1/evolution-webhook-receiver'
)
ON CONFLICT (id) 
DO UPDATE SET 
  n8n_webhook_url = EXCLUDED.n8n_webhook_url,
  evolution_listener_url = EXCLUDED.evolution_listener_url;