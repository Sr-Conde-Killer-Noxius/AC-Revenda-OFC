CREATE OR REPLACE FUNCTION public.prevent_partner_plan_deletion()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.name = 'Plano Parceiro' THEN
    RAISE EXCEPTION 'Não é permitido excluir o Plano Parceiro. Você pode editá-lo se necessário.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_partner_plan_deletion_trigger ON public.subscriber_plans;
CREATE TRIGGER prevent_partner_plan_deletion_trigger
  BEFORE DELETE ON public.subscriber_plans
  FOR EACH ROW EXECUTE FUNCTION public.prevent_partner_plan_deletion();