-- 1. Remover a chave estrangeira existente em subscriptions.user_id
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- 2. Adicionar nova chave estrangeira em subscriptions.user_id referenciando public.profiles.id
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Inserir o "Plano Inicial" na tabela subscriber_plans se não existir
INSERT INTO public.subscriber_plans (name, value, period_days)
SELECT 'Plano Inicial', 25.00, 30
WHERE NOT EXISTS (SELECT 1 FROM public.subscriber_plans WHERE name = 'Plano Inicial');

-- 4. Criar função para impedir a exclusão do "Plano Inicial"
CREATE OR REPLACE FUNCTION public.prevent_default_plan_deletion()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.name = 'Plano Inicial' THEN
    RAISE EXCEPTION 'Não é permitido excluir o Plano Inicial. Você pode editá-lo se necessário.';
  END IF;
  RETURN OLD;
END;
$$;

-- 5. Criar gatilho para a função prevent_default_plan_deletion
DROP TRIGGER IF EXISTS prevent_default_plan_deletion_trigger ON public.subscriber_plans;
CREATE TRIGGER prevent_default_plan_deletion_trigger
BEFORE DELETE ON public.subscriber_plans
FOR EACH ROW EXECUTE FUNCTION public.prevent_default_plan_deletion();