-- Create revenda_webhook_history table
CREATE TABLE public.revenda_webhook_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL,
  payload JSONB,
  status_code INTEGER,
  processing_log TEXT,
  source_user_id UUID
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.revenda_webhook_history ENABLE ROW LEVEL SECURITY;

-- Create policies for each operation needed
-- Only admins can view the history
CREATE POLICY "Admins can view revenda webhook history" ON public.revenda_webhook_history
FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM public.user_roles WHERE (user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)));

-- No INSERT, UPDATE, DELETE policies for authenticated users, as the Edge Function will use service_role