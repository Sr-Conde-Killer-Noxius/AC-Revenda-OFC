-- Adicionando logs à função public.process_notification_queue para diagnóstico

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
    pending_count INTEGER;
BEGIN
    RAISE NOTICE 'process_notification_queue: Função iniciada pelo cron job.';

    -- Constrói a URL da Edge Function
    edge_function_url := 'https://' || supabase_project_id || '.supabase.co/functions/v1/' || edge_function_name;

    -- Seleciona notificações pendentes que estão vencidas ou para vencer agora
    SELECT COUNT(*)
    INTO pending_count
    FROM public.scheduled_notifications
    WHERE status = 'pending' AND send_at <= NOW();

    RAISE NOTICE 'process_notification_queue: Encontrados % agendamentos pendentes para processar.', pending_count;

    FOR notification_record IN
        SELECT id, user_id, client_id, template_id, send_at, automation_id
        FROM public.scheduled_notifications
        WHERE status = 'pending' AND send_at <= NOW()
        FOR UPDATE SKIP LOCKED -- Bloqueia as linhas selecionadas e pula se já estiverem bloqueadas
    LOOP
        RAISE NOTICE 'process_notification_queue: Processando notificação agendada ID: %, Cliente ID: %, Enviar em: %', notification_record.id, notification_record.client_id, notification_record.send_at;

        -- Atualiza o status para 'processing' para evitar reprocessamento
        UPDATE public.scheduled_notifications
        SET status = 'processing'
        WHERE id = notification_record.id;

        -- Invoca a Edge Function assincronamente usando pg_net
        PERFORM extensions.http_post(
            url := edge_function_url,
            headers := ARRAY[
                extensions.http_header('Content-Type', 'application/json')
            ],
            body := jsonb_build_object('id', notification_record.id)
        );

        RAISE NOTICE 'process_notification_queue: Notificação agendada % para o usuário % delegada para a Edge Function de envio.', notification_record.id, notification_record.user_id;
    END LOOP;

    RAISE NOTICE 'process_notification_queue: Concluído o processamento da fila.';
END;
$function$
SET search_path = public;