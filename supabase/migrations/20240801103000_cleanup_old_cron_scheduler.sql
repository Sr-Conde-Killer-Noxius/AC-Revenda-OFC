-- Desativar e remover todos os cron jobs conhecidos
SELECT cron.unschedule('process-notification-queue-job');
SELECT cron.unschedule('process-automated-notifications-job');

-- Remover funções SQL que usam tipos da extensão http ou são parte dela
-- Usamos CASCADE para remover quaisquer objetos dependentes (como triggers, se houver)
DROP FUNCTION IF EXISTS public.http_post(character varying, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.http_post(character varying, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.http_set_curlopt(character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.bytea_to_text(bytea) CASCADE;
DROP FUNCTION IF EXISTS public.http_header(character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.http_delete(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.http_delete(character varying, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.urlencode(bytea) CASCADE;
DROP FUNCTION IF EXISTS public.urlencode(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.urlencode(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.http_head(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.http_list_curlopt() CASCADE;
DROP FUNCTION IF EXISTS public.text_to_bytea(text) CASCADE;
DROP FUNCTION IF EXISTS public.http_reset_curlopt() CASCADE;
DROP FUNCTION IF EXISTS public.http_get(character varying, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.http_get(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.http(http_request) CASCADE;
DROP FUNCTION IF EXISTS public.http_put(character varying, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.http_patch(character varying, character varying, character varying) CASCADE;

-- Remover as funções de agendamento que foram substituídas
DROP FUNCTION IF EXISTS public.process_notification_queue CASCADE;
DROP FUNCTION IF EXISTS public.process_automated_notifications CASCADE;

-- Remover a extensão http (pg_net) e seus tipos
DROP EXTENSION IF EXISTS http CASCADE;
DROP TYPE IF EXISTS public.http_request CASCADE;
DROP TYPE IF EXISTS public.http_response CASCADE;
DROP TYPE IF EXISTS public.http_header CASCADE;