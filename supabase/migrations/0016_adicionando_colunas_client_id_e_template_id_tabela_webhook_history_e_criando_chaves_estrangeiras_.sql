ALTER TABLE public.webhook_history
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
ADD COLUMN template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL;

-- As políticas RLS existentes para webhook_history já cobrem a inserção e seleção de todas as colunas
-- para o user_id autenticado, então não precisam de modificação explícita para as novas colunas.
-- A política de INSERT já foi ajustada na etapa anterior para ser mais segura.