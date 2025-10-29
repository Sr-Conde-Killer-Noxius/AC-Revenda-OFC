DROP POLICY IF EXISTS "Admins can view active payment gateway" ON public.active_payment_gateway;
CREATE POLICY "Authenticated users can view active payment gateway" ON public.active_payment_gateway
FOR SELECT TO authenticated USING (true);