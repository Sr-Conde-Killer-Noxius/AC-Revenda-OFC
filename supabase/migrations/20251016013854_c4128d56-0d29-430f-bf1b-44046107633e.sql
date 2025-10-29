-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configurar cron job para processar fila de notificações a cada minuto
SELECT cron.schedule(
  'process-notification-queue',
  '* * * * *', -- Executa a cada minuto
  $$
  SELECT net.http_post(
    url := 'https://cgqyfpsfymhntumrmbzj.supabase.co/functions/v1/process-queue-and-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    ),
    body := jsonb_build_object('trigger', 'cron', 'time', now())
  ) as request_id;
  $$
);