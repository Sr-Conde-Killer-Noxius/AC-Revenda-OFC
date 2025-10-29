-- ========================================
-- SCRIPT DE DIAGNÓSTICO - AGENDAMENTOS
-- ========================================
-- Execute este script no Supabase SQL Editor para diagnosticar problemas com agendamentos
-- Data: 2025-01-16

-- 1. Verificar horário atual do servidor (deve estar em UTC)
SELECT NOW() AS "Horário Servidor UTC",
       NOW() AT TIME ZONE 'America/Sao_Paulo' AS "Horário São Paulo";

-- 2. Listar todas as notificações agendadas com suas datas
SELECT 
    id,
    client_id,
    template_id,
    send_at AS "Data Agendada (UTC)",
    send_at AT TIME ZONE 'America/Sao_Paulo' AS "Data Agendada (São Paulo)",
    status,
    created_at,
    -- Calcular diferença em minutos entre agora e o horário agendado
    EXTRACT(EPOCH FROM (NOW() - send_at))/60 AS "Minutos desde agendamento",
    -- Se é passado ou futuro
    CASE 
        WHEN send_at <= NOW() THEN '⚠️ DEVERIA TER SIDO ENVIADO'
        ELSE '⏰ Futuro'
    END AS "Status Temporal"
FROM scheduled_notifications
ORDER BY send_at DESC
LIMIT 50;

-- 3. Contar notificações por status
SELECT 
    status,
    COUNT(*) AS quantidade,
    MIN(send_at) AS "Mais antiga",
    MAX(send_at) AS "Mais recente"
FROM scheduled_notifications
GROUP BY status;

-- 4. Notificações que DEVERIAM ter sido enviadas mas estão pendentes
SELECT 
    sn.id,
    c.name AS "Cliente",
    t.name AS "Template",
    sn.send_at AS "Deveria ter enviado em (UTC)",
    sn.send_at AT TIME ZONE 'America/Sao_Paulo' AS "Deveria ter enviado em (SP)",
    EXTRACT(EPOCH FROM (NOW() - sn.send_at))/60 AS "Atrasado (minutos)",
    sn.status
FROM scheduled_notifications sn
LEFT JOIN clients c ON c.id = sn.client_id
LEFT JOIN templates t ON t.id = sn.template_id
WHERE sn.status = 'pending'
  AND sn.send_at <= NOW()
ORDER BY sn.send_at ASC;

-- 5. Histórico de webhooks das últimas 24 horas
SELECT 
    wh.created_at AS "Data",
    c.name AS "Cliente",
    t.name AS "Template",
    wh.webhook_type AS "Tipo",
    wh.status_code AS "Status Code",
    CASE 
        WHEN wh.status_code >= 200 AND wh.status_code < 300 THEN '✅ Sucesso'
        WHEN wh.status_code >= 400 THEN '❌ Erro'
        ELSE '⚠️ Desconhecido'
    END AS "Resultado"
FROM webhook_history wh
LEFT JOIN clients c ON c.id = wh.client_id
LEFT JOIN templates t ON t.id = wh.template_id
WHERE wh.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY wh.created_at DESC
LIMIT 20;

-- 6. Verificar se existem cron jobs ativos (pg_cron)
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
WHERE jobname LIKE '%process%' OR jobname LIKE '%notification%';

-- 7. Verificar configuração de webhook do usuário
SELECT 
    user_id,
    type,
    url,
    created_at,
    updated_at
FROM webhook_configs
WHERE type = 'n8n_message_sender'
ORDER BY created_at DESC;

-- 8. Análise temporal: comparar timezone da coluna send_at
SELECT 
    id,
    send_at AS "send_at (texto bruto)",
    send_at::timestamptz AS "send_at (timestamptz)",
    NOW() AS "NOW() UTC",
    send_at <= NOW() AS "Deveria enviar?",
    CASE 
        WHEN send_at::text LIKE '%+%' THEN '✅ Tem timezone'
        WHEN send_at::text LIKE '%-00%' THEN '✅ UTC explícito'
        ELSE '⚠️ Sem timezone explícito'
    END AS "Formato timezone"
FROM scheduled_notifications
WHERE status = 'pending'
ORDER BY send_at DESC
LIMIT 10;

-- 9. Resumo executivo
SELECT 
    'Total de agendamentos' AS metrica,
    COUNT(*)::text AS valor
FROM scheduled_notifications
UNION ALL
SELECT 
    'Pendentes atrasados (devem ser enviados)',
    COUNT(*)::text
FROM scheduled_notifications
WHERE status = 'pending' AND send_at <= NOW()
UNION ALL
SELECT 
    'Pendentes futuros',
    COUNT(*)::text
FROM scheduled_notifications
WHERE status = 'pending' AND send_at > NOW()
UNION ALL
SELECT 
    'Em processamento',
    COUNT(*)::text
FROM scheduled_notifications
WHERE status = 'processing'
UNION ALL
SELECT 
    'Enviados com sucesso',
    COUNT(*)::text
FROM scheduled_notifications
WHERE status = 'sent'
UNION ALL
SELECT 
    'Falhados',
    COUNT(*)::text
FROM scheduled_notifications
WHERE status = 'failed';

-- ========================================
-- INSTRUÇÕES DE USO:
-- ========================================
-- 1. Copie todo este script
-- 2. Cole no Supabase Dashboard → SQL Editor
-- 3. Execute (botão RUN)
-- 4. Analise os resultados de cada query
-- 
-- ATENÇÃO ESPECIAL PARA:
-- - Query #4: Mostra notificações atrasadas
-- - Query #6: Verifica se há cron jobs ativos (NÃO deveria ter!)
-- - Query #8: Analisa o formato das datas
-- - Query #9: Resumo geral do sistema
