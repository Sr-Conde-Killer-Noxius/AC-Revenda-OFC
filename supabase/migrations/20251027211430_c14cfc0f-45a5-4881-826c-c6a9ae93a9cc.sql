-- Adicionar políticas INSERT para histórico
-- Permitir que usuários autenticados insiram seus próprios registros de histórico

-- n8n_qr_code_history
CREATE POLICY "Usuários podem inserir seu próprio histórico QR"
ON public.n8n_qr_code_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- n8n_message_sender_history  
CREATE POLICY "Usuários podem inserir seu próprio histórico de mensagens"
ON public.n8n_message_sender_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- evolution_logout_history
CREATE POLICY "Usuários podem inserir seu próprio histórico logout"
ON public.evolution_logout_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- evolution_api_history (apenas service_role pode inserir, pois vem do webhook)
CREATE POLICY "Service role pode inserir histórico Evolution API"
ON public.evolution_api_history
FOR INSERT
TO service_role
WITH CHECK (true);

-- Configurar Realtime para user_instances
ALTER TABLE public.user_instances REPLICA IDENTITY FULL;

-- Adicionar à publicação realtime se não estiver
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_instances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_instances;
  END IF;
END $$;