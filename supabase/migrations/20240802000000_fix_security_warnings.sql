-- Correção de Alertas de Segurança do Banco de Dados Supabase

-- 1. Corrigir o search_path das Funções para 'public'

-- Função: public.set_client_status_based_on_due_date
CREATE OR REPLACE FUNCTION public.set_client_status_based_on_due_date()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Verifica se o status atual não é 'inativo'. Não queremos reativar um cliente cancelado automaticamente.
  IF NEW.status != 'inactive' THEN
    -- Se a data de vencimento for anterior a hoje, define o status como 'vencido'.
    IF NEW.next_billing_date < CURRENT_DATE THEN
      NEW.status := 'overdue';
    -- Caso contrário, define o status como 'ativo'.
    ELSE
      NEW.status := 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
SET search_path = public;

-- Função: public.handle_client_cancellation
CREATE OR REPLACE FUNCTION public.handle_client_cancellation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- A função só executa se o status foi alterado PARA 'inactive'
  IF NEW.status = 'inactive' AND OLD.status != 'inactive' THEN

    -- Ação 1: Remover o cliente de todas as futuras mensagens agendadas
    DELETE FROM public.pending_sends
    WHERE client_id = NEW.id;

    -- Ação 2: Remover o ID do cliente de todas as regras de automação
    -- onde ele possa estar presente.
    UPDATE public.automations
    SET client_ids = array_remove(client_ids, NEW.id)
    WHERE user_id = NEW.user_id AND NEW.id = ANY(client_ids);

  END IF;

  RETURN NEW;
END;
$function$
SET search_path = public;

-- Função: public.handle_client_overdue_status
CREATE OR REPLACE FUNCTION public.handle_client_overdue_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- A função só executa se o status foi alterado PARA 'overdue'
  IF NEW.status = 'overdue' AND OLD.status != 'overdue' THEN

    -- Ação: Remove o cliente de todas as futuras mensagens agendadas
    DELETE FROM public.pending_sends
    WHERE client_id = NEW.id;

  END IF;

  RETURN NEW;
END;
$function$
SET search_path = public;

-- Função: public.update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
SET search_path = public;

-- Função: public.process_notification_queue
-- Nota: Esta função já tinha SECURITY DEFINER SET search_path = '', que será substituído por SET search_path = public.
CREATE OR REPLACE FUNCTION public.process_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    notification_record RECORD;
    edge_function_url TEXT;
    supabase_project_id TEXT := 'cgqyfpsfymhntumrmbzj'; -- Substitua pelo seu Project ID do Supabase
    edge_function_name TEXT := 'send-scheduled-notification';
BEGIN
    -- Constrói a URL da Edge Function
    edge_function_url := 'https://' || supabase_project_id || '.supabase.co/functions/v1/' || edge_function_name;

    -- Seleciona notificações pendentes que estão vencidas ou para vencer agora
    FOR notification_record IN
        SELECT id, user_id, client_id, template_id, send_at
        FROM public.scheduled_notifications
        WHERE status = 'pending' AND send_at <= NOW()
        FOR UPDATE SKIP LOCKED -- Bloqueia as linhas selecionadas e pula se já estiverem bloqueadas
    LOOP
        -- Atualiza o status para 'processing' para evitar reprocessamento
        UPDATE public.scheduled_notifications
        SET status = 'processing'
        WHERE id = notification_record.id;

        -- Invoca a Edge Function assincronamente usando pg_net
        PERFORM extensions.http_post( -- Usar extensions.http_post
            url := edge_function_url,
            headers := ARRAY[
                extensions.http_header('Content-Type', 'application/json') -- Usar extensions.http_header
            ],
            body := jsonb_build_object('id', notification_record.id)
        );

        RAISE NOTICE 'Notificação agendada % para o usuário % enviada para a Edge Function para processamento.', notification_record.id, notification_record.user_id;
    END LOOP;
END;
$function$
SET search_path = public;


-- 2. Isolar a Extensão 'http' no schema 'extensions'

-- Criar um schema dedicado para extensões, se ainda não existir.
CREATE SCHEMA IF NOT EXISTS extensions;

-- Mover a extensão 'http' do schema 'public' para o schema 'extensions'.
ALTER EXTENSION http SET SCHEMA extensions;