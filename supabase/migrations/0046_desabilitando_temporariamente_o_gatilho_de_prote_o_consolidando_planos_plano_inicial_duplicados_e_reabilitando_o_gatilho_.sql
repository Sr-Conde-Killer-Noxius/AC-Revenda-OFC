-- 1. Desabilitar temporariamente o gatilho de proteção
ALTER TABLE public.subscriber_plans DISABLE TRIGGER prevent_default_plan_deletion_trigger;

-- 2. Consolidar entradas duplicadas de 'Plano Inicial' na tabela subscriber_plans
WITH plan_to_keep AS (
    SELECT id
    FROM public.subscriber_plans
    WHERE name = 'Plano Inicial'
    ORDER BY created_at ASC
    LIMIT 1
)
DELETE FROM public.subscriber_plans
WHERE name = 'Plano Inicial'
  AND id NOT IN (SELECT id FROM plan_to_keep);

-- 3. Reabilitar o gatilho de proteção
ALTER TABLE public.subscriber_plans ENABLE TRIGGER prevent_default_plan_deletion_trigger;