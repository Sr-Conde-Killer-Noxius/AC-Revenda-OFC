-- Create evolution_api_history table
CREATE TABLE public.evolution_api_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  client_name_snapshot TEXT
);

-- Enable RLS for evolution_api_history
ALTER TABLE public.evolution_api_history ENABLE ROW LEVEL SECURITY;

-- Policies for evolution_api_history
CREATE POLICY "evolution_api_history_select_policy" ON public.evolution_api_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "evolution_api_history_insert_policy" ON public.evolution_api_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "evolution_api_history_update_policy" ON public.evolution_api_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "evolution_api_history_delete_policy" ON public.evolution_api_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create n8n_qr_code_history table
CREATE TABLE public.n8n_qr_code_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  client_name_snapshot TEXT
);

-- Enable RLS for n8n_qr_code_history
ALTER TABLE public.n8n_qr_code_history ENABLE ROW LEVEL SECURITY;

-- Policies for n8n_qr_code_history
CREATE POLICY "n8n_qr_code_history_select_policy" ON public.n8n_qr_code_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n8n_qr_code_history_insert_policy" ON public.n8n_qr_code_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n8n_qr_code_history_update_policy" ON public.n8n_qr_code_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n8n_qr_code_history_delete_policy" ON public.n8n_qr_code_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create n8n_message_sender_history table
CREATE TABLE public.n8n_message_sender_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  client_name_snapshot TEXT
);

-- Enable RLS for n8n_message_sender_history
ALTER TABLE public.n8n_message_sender_history ENABLE ROW LEVEL SECURITY;

-- Policies for n8n_message_sender_history
CREATE POLICY "n8n_message_sender_history_select_policy" ON public.n8n_message_sender_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n8n_message_sender_history_insert_policy" ON public.n8n_message_sender_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n8n_message_sender_history_update_policy" ON public.n8n_message_sender_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n8n_message_sender_history_delete_policy" ON public.n8n_message_sender_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);