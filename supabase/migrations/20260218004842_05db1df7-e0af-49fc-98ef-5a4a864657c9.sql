
-- Tabela de configurações do Mercado Pago por usuário
CREATE TABLE public.mercado_pago_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  public_key text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 1.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de pagamentos do Mercado Pago
CREATE TABLE public.mercado_pago_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id text,
  payer_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  amount_credits integer NOT NULL,
  total_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  qr_code text,
  qr_code_base64 text,
  copy_paste text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mercado_pago_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_pago_payments ENABLE ROW LEVEL SECURITY;

-- Triggers para updated_at
CREATE TRIGGER update_mercado_pago_configs_updated_at
  BEFORE UPDATE ON public.mercado_pago_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mercado_pago_payments_updated_at
  BEFORE UPDATE ON public.mercado_pago_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: mercado_pago_configs
CREATE POLICY "Admins podem ver todas as configs MP"
  ON public.mercado_pago_configs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar qualquer config MP"
  ON public.mercado_pago_configs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários podem ver sua própria config MP"
  ON public.mercado_pago_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir sua própria config MP"
  ON public.mercado_pago_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar sua própria config MP"
  ON public.mercado_pago_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar sua própria config MP"
  ON public.mercado_pago_configs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: mercado_pago_payments
CREATE POLICY "Admins podem ver todos os pagamentos MP"
  ON public.mercado_pago_payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Payers podem ver seus próprios pagamentos"
  ON public.mercado_pago_payments FOR SELECT
  USING (auth.uid() = payer_id);

CREATE POLICY "Receivers podem ver pagamentos recebidos"
  ON public.mercado_pago_payments FOR SELECT
  USING (auth.uid() = receiver_id);

CREATE POLICY "Sistema pode inserir pagamentos MP"
  ON public.mercado_pago_payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar pagamentos MP"
  ON public.mercado_pago_payments FOR UPDATE
  USING (true);

-- Permitir que subordinados leiam a config do superior (para saber se MP está ativo e o preço)
CREATE POLICY "Subordinados podem ver config MP do superior"
  ON public.mercado_pago_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.created_by = mercado_pago_configs.user_id
    )
  );
