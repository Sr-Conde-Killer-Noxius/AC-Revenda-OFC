CREATE POLICY "Allow authenticated users to read subscriber plans" ON public.subscriber_plans
FOR SELECT TO authenticated USING (true);