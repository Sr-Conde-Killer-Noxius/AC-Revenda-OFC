CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  default_plan RECORD;
BEGIN
  -- 1. Inserir na tabela profiles
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- 2. Inserir na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- 3. Buscar o "Plano Inicial" dinamicamente
  SELECT name, value, period_days
  INTO default_plan
  FROM public.subscriber_plans
  WHERE name = 'Plano Inicial'
  LIMIT 1;

  -- 4. Inserir na tabela subscriptions usando o Plano Inicial
  IF default_plan IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_name, price, status, next_billing_date)
    VALUES (
      NEW.id,
      default_plan.name,
      default_plan.value,
      'active',
      (NOW() + (default_plan.period_days || ' days')::INTERVAL)::date
    );
  ELSE
    -- Fallback: Se o Plano Inicial não existir, usar valores padrão
    INSERT INTO public.subscriptions (user_id, plan_name, price, status, next_billing_date)
    VALUES (NEW.id, 'Plano Gratuito', 0.00, 'active', (NOW() + INTERVAL '30 days')::date);
  END IF;

  RETURN NEW;
END;
$$;