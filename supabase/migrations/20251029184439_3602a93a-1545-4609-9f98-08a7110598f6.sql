-- Adicionar políticas RLS para admins nas tabelas de webhook Acerto Certo

-- Políticas para webhook_configs
CREATE POLICY "Admins podem visualizar webhook configs" 
ON public.webhook_configs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem inserir webhook configs" 
ON public.webhook_configs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar webhook configs" 
ON public.webhook_configs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar webhook configs" 
ON public.webhook_configs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para acerto_certo_webhook_history
CREATE POLICY "Admins podem ver histórico de webhooks Acerto Certo" 
ON public.acerto_certo_webhook_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));