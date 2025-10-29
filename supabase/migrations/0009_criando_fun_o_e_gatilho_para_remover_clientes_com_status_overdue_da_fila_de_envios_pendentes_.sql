-- 1. Criar a função que será executada pelo gatilho
CREATE OR REPLACE FUNCTION public.handle_client_overdue_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- A função só executa se o status foi alterado PARA 'overdue'
  IF NEW.status = 'overdue' AND OLD.status != 'overdue' THEN
    
    -- Ação: Remove o cliente de todas as futuras mensagens agendadas
    DELETE FROM public.pending_sends
    WHERE client_id = NEW.id;

  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Criar o gatilho que executa a função APÓS uma atualização na tabela de clientes
-- Primeiro, remove o gatilho antigo se ele existir, para evitar erros
DROP TRIGGER IF EXISTS trigger_handle_client_overdue_status ON public.clients;

-- Cria o novo gatilho
CREATE TRIGGER trigger_handle_client_overdue_status
AFTER UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.handle_client_overdue_status();