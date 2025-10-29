CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  target_plan_name TEXT;
  default_plan RECORD;
BEGIN
  -- 1. Inserir na tabela profiles
  INSERT INTO public.profiles (id, name, email, phone, tax_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'tax_id'
  );

  -- 2. Inserir na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- 3. Determinar o plano com base na origem do usuário
  IF NEW.raw_user_meta_data->>'revenda_source' = 'true' THEN
    target_plan_name := 'Plano Parceiro';
  ELSE
    target_plan_name := 'Plano Inicial';
  END IF;

  -- 4. Buscar o plano dinamicamente
  SELECT name, value, period_days
  INTO default_plan
  FROM public.subscriber_plans
  WHERE name = target_plan_name
  LIMIT 1;

  -- 5. Inserir na tabela subscriptions usando o plano determinado
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
    -- Fallback: Se o plano alvo (Parceiro ou Inicial) não existir, usar Plano Gratuito
    INSERT INTO public.subscriptions (user_id, plan_name, price, status, next_billing_date)
    VALUES (NEW.id, 'Plano Gratuito', 0.00, 'active', (NOW() + INTERVAL '30 days')::date);
  END IF;

  RETURN NEW;
END;
$$;