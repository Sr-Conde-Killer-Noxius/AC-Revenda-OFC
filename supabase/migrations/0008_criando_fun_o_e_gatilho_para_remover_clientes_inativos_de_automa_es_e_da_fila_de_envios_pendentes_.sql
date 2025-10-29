-- 1. Criar a função que contém a lógica de remoção
CREATE OR REPLACE FUNCTION public.handle_client_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- 2. Criar o gatilho que executa a função APÓS uma atualização na tabela de clientes
-- Primeiro, remove o gatilho antigo se ele existir, para evitar erros
DROP TRIGGER IF EXISTS trigger_handle_client_cancellation ON public.clients;

-- Cria o novo gatilho
CREATE TRIGGER trigger_handle_client_cancellation
AFTER UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.handle_client_cancellation();