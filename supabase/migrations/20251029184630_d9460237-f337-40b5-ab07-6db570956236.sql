-- Adicionar políticas RLS para admins visualizarem históricos de webhooks

-- Políticas para evolution_api_history
CREATE POLICY "Admins podem ver histórico da Evolution API" 
ON public.evolution_api_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para n8n_qr_code_history
CREATE POLICY "Admins podem ver todo histórico QR" 
ON public.n8n_qr_code_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para evolution_logout_history
CREATE POLICY "Admins podem ver todo histórico logout" 
ON public.evolution_logout_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para n8n_message_sender_history
CREATE POLICY "Admins podem ver todo histórico de mensagens" 
ON public.n8n_message_sender_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));