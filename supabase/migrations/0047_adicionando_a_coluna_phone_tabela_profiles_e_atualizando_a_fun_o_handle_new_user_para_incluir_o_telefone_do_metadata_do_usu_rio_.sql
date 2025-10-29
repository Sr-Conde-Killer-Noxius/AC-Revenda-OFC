-- Adicionar a coluna 'phone' à tabela 'profiles' se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
        -- Adicionar um índice para consultas mais rápidas, se necessário
        CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
        COMMENT ON COLUMN public.profiles.phone IS 'Número de telefone do usuário, obrigatório para usuários não-admin.';
    END IF;
END
$$;

-- Atualizar a função handle_new_user para incluir o campo 'phone'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  default_plan RECORD;
BEGIN
  -- 1. Inserir na tabela profiles
  INSERT INTO public.profiles (id, name, email, phone) -- Adicionado 'phone'
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone' -- Tenta pegar o telefone do metadata
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