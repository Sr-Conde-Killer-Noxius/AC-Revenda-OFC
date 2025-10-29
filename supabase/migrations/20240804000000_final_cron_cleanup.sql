-- Desativar e remover todos os cron jobs conhecidos para evitar execuções indesejadas
SELECT cron.unschedule('process-notification-queue-job');
SELECT cron.unschedule('process-automated-notifications-job');

-- Remover as funções de agendamento antigas que foram substituídas pelas Edge Functions.
-- Usamos CASCADE para garantir que quaisquer objetos dependentes (como triggers) também sejam removidos.
DROP FUNCTION IF EXISTS public.process_notification_queue CASCADE;
DROP FUNCTION IF EXISTS public.process_automated_notifications CASCADE;

-- Remover todas as funções relacionadas à extensão 'http' (pg_net) que podem estar causando o erro.
-- A ordem é importante para evitar erros de dependência.
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
DROP FUNCTION IF EXISTS public.http(http_request) CASCADE; -- Esta pode falhar se o tipo http_request já não existir, mas é importante tentar.
DROP FUNCTION IF EXISTS public.http_put(character varying, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.http_patch(character varying, character varying, character varying) CASCADE;

-- Finalmente, remover a própria extensão 'http' e seus tipos, se ainda existirem.
DROP EXTENSION IF EXISTS http CASCADE;
DROP TYPE IF EXISTS public.http_request CASCADE;
DROP TYPE IF EXISTS public.http_response CASCADE;
DROP TYPE IF EXISTS public.http_header CASCADE;