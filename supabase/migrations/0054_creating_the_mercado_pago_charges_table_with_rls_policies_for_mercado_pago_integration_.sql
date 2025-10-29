-- Create mercado_pago_charges table
CREATE TABLE public.mercado_pago_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  mercado_pago_payment_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'approved', 'rejected', 'cancelled'
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.mercado_pago_charges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mercado_pago_charges
-- Users can view their own Mercado Pago charges
CREATE POLICY "Users can view their own Mercado Pago charges" ON public.mercado_pago_charges
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own Mercado Pago charges (e.g., when initiating a payment)
CREATE POLICY "Users can insert their own Mercado Pago charges" ON public.mercado_pago_charges
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own Mercado Pago charges (e.g., if status changes on client-side)
CREATE POLICY "Users can update their own Mercado Pago charges" ON public.mercado_pago_charges
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete their own Mercado Pago charges (if needed, though usually not for payments)
CREATE POLICY "Users can delete their own Mercado Pago charges" ON public.mercado_pago_charges
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Admin policies (optional, but good for full control)
-- Admins can view all Mercado Pago charges
CREATE POLICY "Admins can view all Mercado Pago charges" ON public.mercado_pago_charges
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can insert Mercado Pago charges for any user
CREATE POLICY "Admins can insert Mercado Pago charges" ON public.mercado_pago_charges
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can update Mercado Pago charges for any user
CREATE POLICY "Admins can update Mercado Pago charges" ON public.mercado_pago_charges
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can delete Mercado Pago charges for any user
CREATE POLICY "Admins can delete Mercado Pago charges" ON public.mercado_pago_charges
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));