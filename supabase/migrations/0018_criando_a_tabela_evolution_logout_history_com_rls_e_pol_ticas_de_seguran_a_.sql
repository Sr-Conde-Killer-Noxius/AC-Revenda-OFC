-- Create evolution_logout_history table
CREATE TABLE public.evolution_logout_history (
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

-- Enable RLS (REQUIRED)
ALTER TABLE public.evolution_logout_history ENABLE ROW LEVEL SECURITY;

-- Create policies for each operation
CREATE POLICY "evolution_logout_history_select_policy" ON public.evolution_logout_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "evolution_logout_history_insert_policy" ON public.evolution_logout_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "evolution_logout_history_update_policy" ON public.evolution_logout_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "evolution_logout_history_delete_policy" ON public.evolution_logout_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);