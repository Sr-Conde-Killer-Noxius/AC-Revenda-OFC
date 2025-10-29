CREATE OR REPLACE FUNCTION public.set_subscription_status_based_on_plan_and_due_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  plan_is_free BOOLEAN;
  local_today DATE;
BEGIN
  -- Se o status já estiver sendo definido como 'overdue', respeite essa definição
  -- Isso permite que processos externos (como o webhook da revenda) forcem o status 'overdue'
  IF NEW.status = 'overdue' THEN
    RETURN NEW;
  END IF;

  -- Obtém a data de hoje no fuso horário 'America/Sao_Paulo'
  local_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Busca se o plano associado é gratuito
  SELECT sp.is_free INTO plan_is_free
  FROM public.subscriber_plans sp
  WHERE sp.name = NEW.plan_name
  LIMIT 1;

  -- Se o plano for gratuito, o status é sempre 'active' e next_billing_date é NULL
  IF plan_is_free THEN
    NEW.status := 'active';
    NEW.next_billing_date := NULL;
  ELSE
    -- Se o plano não for gratuito, verifica a data de vencimento
    IF NEW.next_billing_date IS NULL THEN
      -- Se não for gratuito e não tiver data de vencimento, é inativo
      NEW.status := 'inactive';
    ELSIF NEW.next_billing_date < local_today THEN
      NEW.status := 'overdue';
    ELSE
      NEW.status := 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;