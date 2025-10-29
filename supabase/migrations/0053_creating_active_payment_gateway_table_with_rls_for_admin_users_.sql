-- Create active_payment_gateway table
CREATE TABLE public.active_payment_gateway (
  id BIGINT PRIMARY KEY DEFAULT 1,
  gateway_name TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.active_payment_gateway ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view the active payment gateway
CREATE POLICY "Admins can view active payment gateway" ON public.active_payment_gateway
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy: Admins can update the active payment gateway
CREATE POLICY "Admins can update active payment gateway" ON public.active_payment_gateway
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy: Admins can insert the active payment gateway (for initial setup)
CREATE POLICY "Admins can insert active payment gateway" ON public.active_payment_gateway
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Ensure only one row exists by preventing inserts if id=1 already exists
-- This is handled by the Edge Function's upsert logic, but a unique constraint on id=1 is good.
-- No need for a specific trigger here, the primary key default 1 handles it.