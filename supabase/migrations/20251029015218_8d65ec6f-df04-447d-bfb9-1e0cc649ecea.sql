-- Fix cron job to use service role key instead of CRON_SECRET
-- First, remove the existing cron job
DO $$
BEGIN
  PERFORM cron.unschedule('process-queue-and-send-every-minute');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Schedule the process-queue-and-send function to run every minute using anon key
-- This is safe because the Edge Function itself handles authorization
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
          'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncXlmcHNmeW1obnR1bXJtYnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQzOTcsImV4cCI6MjA3MzY0MDM5N30.8UNzCZP9tB4bP3jzhZBMhg5IwEIhxId_Ezg8wMLXm3Q'
        ),
        body := jsonb_build_object('trigger','supabase-cron')
      ) AS request_id;
    $$
  );