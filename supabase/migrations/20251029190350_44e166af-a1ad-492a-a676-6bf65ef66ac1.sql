-- Criar tabela user_credits para armazenar saldo de créditos dos Masters
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela credit_transactions para histórico de transações
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_added', 'credit_spent')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL,
  related_user_id UUID,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar coluna credit_expiry_date em profiles
ALTER TABLE public.profiles
ADD COLUMN credit_expiry_date TIMESTAMPTZ;

-- Criar índices para performance
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_profiles_credit_expiry ON public.profiles(credit_expiry_date);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_credits
CREATE POLICY "Admins podem ver todos os créditos"
  ON public.user_credits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Masters podem ver seus próprios créditos"
  ON public.user_credits FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role) AND user_id = auth.uid());

CREATE POLICY "Admins podem modificar créditos"
  ON public.user_credits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode inserir/atualizar créditos"
  ON public.user_credits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar créditos"
  ON public.user_credits FOR UPDATE
  USING (true);

-- Políticas RLS para credit_transactions
CREATE POLICY "Admins podem ver todo histórico de transações"
  ON public.credit_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Masters podem ver seu próprio histórico"
  ON public.credit_transactions FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role) AND user_id = auth.uid());

CREATE POLICY "Sistema pode inserir transações"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (true);

-- Trigger para atualizar updated_at em user_credits
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();