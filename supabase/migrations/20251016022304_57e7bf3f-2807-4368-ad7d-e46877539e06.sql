-- Ensure pg_cron schedules our Edge Function every minute using Vault secret
-- Safely remove any existing job with the same name
DO $$
BEGIN
  PERFORM cron.unschedule('process-queue-and-send-every-minute');
EXCEPTION WHEN OTHERS THEN
  -- ignore if it doesn't exist
  NULL;
END;
$$;

-- Schedule the process-queue-and-send function to run every minute
SELECT
  cron.schedule(
    'process-queue-and-send-every-minute',
    '* * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://cgqyfpsfymhntumrmbzj.supabase.co/functions/v1/process-queue-and-send',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET')
        ),
        body := jsonb_build_object('trigger','supabase-cron')
      ) AS request_id;
    $$
  );