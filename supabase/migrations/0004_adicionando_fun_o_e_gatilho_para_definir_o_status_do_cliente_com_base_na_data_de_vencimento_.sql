-- 1. Criar a função que será executada pelo gatilho
CREATE OR REPLACE FUNCTION public.set_client_status_based_on_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- 2. Criar o gatilho que executa a função antes de qualquer inserção ou atualização na tabela de clientes
-- Primeiro, remove o gatilho antigo se ele existir, para evitar erros
DROP TRIGGER IF EXISTS trigger_set_client_status ON public.clients;

-- Cria o novo gatilho
CREATE TRIGGER trigger_set_client_status
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.set_client_status_based_on_due_date();