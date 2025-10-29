CREATE OR REPLACE FUNCTION public.set_client_status_based_on_due_date()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  local_today DATE;
BEGIN
  -- Obtém a data de hoje no fuso horário 'America/Sao_Paulo'
  local_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Apenas atualiza o status se não for 'inactive' (cancelado)
  IF NEW.status != 'inactive' THEN
    -- Se a data de vencimento for anterior a local_today, define o status como 'overdue'
    IF NEW.next_billing_date < local_today THEN
      NEW.status := 'overdue';
    -- Caso contrário, se for local_today ou no futuro, define o status como 'active'
    ELSE
      NEW.status := 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;