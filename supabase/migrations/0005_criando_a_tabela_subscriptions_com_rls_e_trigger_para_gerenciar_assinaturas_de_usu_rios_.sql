-- Tabela para armazenar detalhes da assinatura de cada utilizador
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive', -- ex: 'active', 'inactive', 'past_due'
  next_billing_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança: Utilizadores só podem ver e gerir a sua própria assinatura
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para atualizar 'updated_at'
CREATE TRIGGER update_subscriptions_updated_at 
BEFORE UPDATE ON public.subscriptions 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();