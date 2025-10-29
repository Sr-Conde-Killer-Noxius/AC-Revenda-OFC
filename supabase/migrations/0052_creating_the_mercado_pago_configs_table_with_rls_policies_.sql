CREATE TABLE public.mercado_pago_configs (
  id BIGINT PRIMARY KEY DEFAULT 1,
  mercado_pago_public_key TEXT NOT NULL,
  mercado_pago_access_token TEXT NOT NULL,
  mercado_pago_client_id TEXT NOT NULL,
  mercado_pago_client_secret TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.mercado_pago_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view Mercado Pago configs" ON public.mercado_pago_configs
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage Mercado Pago configs" ON public.mercado_pago_configs
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Ensure only one row exists
ALTER TABLE public.mercado_pago_configs ADD CONSTRAINT enforce_single_row CHECK (id = 1);