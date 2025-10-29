CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);

  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Insert into subscriptions with a default free plan
  INSERT INTO public.subscriptions (user_id, plan_name, price, status, next_billing_date)
  VALUES (NEW.id, 'Plano Gratuito', 0.00, 'active', (NOW() + INTERVAL '30 days')::date); -- Default to active for 30 days

  RETURN NEW;
END;
$$;