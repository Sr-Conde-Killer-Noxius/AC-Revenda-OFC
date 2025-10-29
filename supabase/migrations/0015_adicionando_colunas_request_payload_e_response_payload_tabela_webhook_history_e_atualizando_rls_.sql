-- Adicionar colunas request_payload e response_payload à tabela webhook_history
ALTER TABLE public.webhook_history
ADD COLUMN request_payload JSONB,
ADD COLUMN response_payload JSONB;

-- Atualizar políticas RLS para incluir as novas colunas
-- A política de INSERT já permite a inserção de todas as colunas por padrão,
-- mas é bom revisar para garantir que não haja restrições inesperadas.
-- Se a política de INSERT for 'WITH CHECK (auth.uid() = user_id)', ela já cobre as novas colunas.
-- Se for 'true', também cobre.

-- Exemplo de revisão/criação de política de INSERT (se necessário, ajuste conforme sua política existente)
-- CREATE OR REPLACE POLICY "Users can insert their own webhook history" ON public.webhook_history
-- FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- A política de SELECT também deve permitir a leitura das novas colunas.
-- CREATE OR REPLACE POLICY "Users can view their own webhook history" ON public.webhook_history
-- FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Se as políticas existentes já são abrangentes (e.g., SELECT USING (true) ou INSERT WITH CHECK (true)),
-- não é necessário alterá-las explicitamente para as novas colunas.
-- No entanto, se houver políticas mais restritivas, elas precisariam ser atualizadas.
-- Com base no seu schema, as políticas existentes para webhook_history são:
-- "Users can view their own webhook history" ON webhook_history FOR SELECT USING (auth.uid() = user_id);
-- "Users can insert their own webhook history" ON webhook_history FOR INSERT;
-- A política de INSERT atual é muito permissiva. Vamos ajustá-la para ser mais segura.

DROP POLICY IF EXISTS "Users can insert their own webhook history" ON public.webhook_history;
CREATE POLICY "Users can insert their own webhook history" ON public.webhook_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- A política de SELECT já está boa.