-- Fix client status timezone issue in set_client_status_based_on_due_date function

CREATE OR REPLACE FUNCTION public.set_client_status_based_on_due_date()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    local_current_date DATE;
BEGIN
  -- Get the current date in the 'America/Sao_Paulo' timezone
  -- This ensures consistency with the application's expected "today"
  local_current_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Verifica se o status atual não é 'inativo'. Não queremos reativar um cliente cancelado automaticamente.
  IF NEW.status != 'inactive' THEN
    -- Se a data de vencimento for anterior a hoje (na timezone local), define o status como 'overdue'.
    IF NEW.next_billing_date < local_current_date THEN
      NEW.status := 'overdue';
    -- Caso contrário, define o status como 'ativo'.
    ELSE
      NEW.status := 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;