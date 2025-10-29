-- Etapa 1: Modificar Políticas RLS para Acesso de Admin em tabelas com user_id
-- Aplicar o padrão "Users can manage their own data OR Admins can manage all"

-- Tables with FOR ALL policies
-- clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage their own clients OR Admins can manage all" ON public.clients
FOR ALL TO authenticated
USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- plans
DROP POLICY IF EXISTS "Users can manage their own plans" ON public.plans;
CREATE POLICY "Users can manage their own plans OR Admins can manage all" ON public.plans
FOR ALL TO authenticated
USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- templates
DROP POLICY IF EXISTS "Users can manage their own templates" ON public.templates;
CREATE POLICY "Users can manage their own templates OR Admins can manage all" ON public.templates
FOR ALL TO authenticated
USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- automations
DROP POLICY IF EXISTS "Users can manage their own automations" ON public.automations;
CREATE POLICY "Users can manage their own automations OR Admins can manage all" ON public.automations
FOR ALL TO authenticated
USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- user_instances
DROP POLICY IF EXISTS "Users can manage their own instance mapping" ON public.user_instances;
CREATE POLICY "Users can manage their own instance mapping OR Admins can manage all" ON public.user_instances
FOR ALL TO authenticated
USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- Tables with specific SELECT/INSERT/UPDATE/DELETE policies
-- financial_entries
DROP POLICY IF EXISTS "Users can view their own financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Users can insert their own financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Users can update their own financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Users can delete their own financial entries" ON public.financial_entries;
CREATE POLICY "Users can view their own financial entries OR Admins can view all" ON public.financial_entries
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can insert their own financial entries OR Admins can insert for others" ON public.financial_entries
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own financial entries OR Admins can update for others" ON public.financial_entries
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own financial entries OR Admins can delete for others" ON public.financial_entries
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- scheduled_notifications
DROP POLICY IF EXISTS "Users can view their own scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Users can insert their own scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Users can update their own scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Users can delete their own scheduled notifications" ON public.scheduled_notifications;
CREATE POLICY "Users can view their own scheduled notifications OR Admins can view all" ON public.scheduled_notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can insert their own scheduled notifications OR Admins can insert for others" ON public.scheduled_notifications
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own scheduled notifications OR Admins can update for others" ON public.scheduled_notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own scheduled notifications OR Admins can delete for others" ON public.scheduled_notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- webhook_history
DROP POLICY IF EXISTS "Users can view their own webhook history" ON public.webhook_history;
DROP POLICY IF EXISTS "Users can insert their own webhook history" ON public.webhook_history;
DROP POLICY IF EXISTS "Users can update their own webhook history" ON public.webhook_history;
DROP POLICY IF EXISTS "Users can delete their own webhook history" ON public.webhook_history;
CREATE POLICY "Users can view their own webhook history OR Admins can view all" ON public.webhook_history
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can insert their own webhook history OR Admins can insert for others" ON public.webhook_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own webhook history OR Admins can update for others" ON public.webhook_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own webhook history OR Admins can delete for others" ON public.webhook_history
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- connection_status
DROP POLICY IF EXISTS "Users can view their own connection status" ON public.connection_status;
DROP POLICY IF EXISTS "Users can insert their own connection status" ON public.connection_status;
DROP POLICY IF EXISTS "Users can update their own connection status" ON public.connection_status;
DROP POLICY IF EXISTS "Users can delete their own connection status" ON public.connection_status;
CREATE POLICY "Users can view their own connection status OR Admins can view all" ON public.connection_status
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can insert their own connection status OR Admins can insert for others" ON public.connection_status
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own connection status OR Admins can update for others" ON public.connection_status
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own connection status OR Admins can delete for others" ON public.connection_status
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- evolution_api_history
DROP POLICY IF EXISTS "evolution_api_history_select_policy" ON public.evolution_api_history;
DROP POLICY IF EXISTS "evolution_api_history_insert_policy" ON public.evolution_api_history;
DROP POLICY IF EXISTS "evolution_api_history_update_policy" ON public.evolution_api_history;
DROP POLICY IF EXISTS "evolution_api_history_delete_policy" ON public.evolution_api_history;
CREATE POLICY "evolution_api_history_select_policy OR Admins can view all" ON public.evolution_api_history
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "evolution_api_history_insert_policy OR Admins can insert for others" ON public.evolution_api_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "evolution_api_history_update_policy OR Admins can update for others" ON public.evolution_api_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "evolution_api_history_delete_policy OR Admins can delete for others" ON public.evolution_api_history
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- n8n_qr_code_history
DROP POLICY IF EXISTS "n8n_qr_code_history_select_policy" ON public.n8n_qr_code_history;
DROP POLICY IF EXISTS "n8n_qr_code_history_insert_policy" ON public.n8n_qr_code_history;
DROP POLICY IF EXISTS "n8n_qr_code_history_update_policy" ON public.n8n_qr_code_history;
DROP POLICY IF EXISTS "n8n_qr_code_history_delete_policy" ON public.n8n_qr_code_history;
CREATE POLICY "n8n_qr_code_history_select_policy OR Admins can view all" ON public.n8n_qr_code_history
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "n8n_qr_code_history_insert_policy OR Admins can insert for others" ON public.n8n_qr_code_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "n8n_qr_code_history_update_policy OR Admins can update for others" ON public.n8n_qr_code_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "n8n_qr_code_history_delete_policy OR Admins can delete for others" ON public.n8n_qr_code_history
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- n8n_message_sender_history
DROP POLICY IF EXISTS "n8n_message_sender_history_select_policy" ON public.n8n_message_sender_history;
DROP POLICY IF EXISTS "n8n_message_sender_history_insert_policy" ON public.n8n_message_sender_history;
DROP POLICY IF EXISTS "n8n_message_sender_history_update_policy" ON public.n8n_message_sender_history;
DROP POLICY IF EXISTS "n8n_message_sender_history_delete_policy" ON public.n8n_message_sender_history;
CREATE POLICY "n8n_message_sender_history_select_policy OR Admins can view all" ON public.n8n_message_sender_history
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "n8n_message_sender_history_insert_policy OR Admins can insert for others" ON public.n8n_message_sender_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "n8n_message_sender_history_update_policy OR Admins can update for others" ON public.n8n_message_sender_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "n8n_message_sender_history_delete_policy OR Admins can delete for others" ON public.n8n_message_sender_history
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- evolution_logout_history
DROP POLICY IF EXISTS "evolution_logout_history_select_policy" ON public.evolution_logout_history;
DROP POLICY IF EXISTS "evolution_logout_history_insert_policy" ON public.evolution_logout_history;
DROP POLICY IF EXISTS "evolution_logout_history_update_policy" ON public.evolution_logout_history;
DROP POLICY IF EXISTS "evolution_logout_history_delete_policy" ON public.evolution_logout_history;
CREATE POLICY "evolution_logout_history_select_policy OR Admins can view all" ON public.evolution_logout_history
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "evolution_logout_history_insert_policy OR Admins can insert for others" ON public.evolution_logout_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "evolution_logout_history_update_policy OR Admins can update for others" ON public.evolution_logout_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "evolution_logout_history_delete_policy OR Admins can delete for others" ON public.evolution_logout_history
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- logs
DROP POLICY IF EXISTS "Users can view their own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can create their own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can update their own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can delete their own logs" ON public.logs;
CREATE POLICY "Users can view their own logs OR Admins can view all" ON public.logs
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can insert their own logs OR Admins can insert for others" ON public.logs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own logs OR Admins can update for others" ON public.logs
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own logs OR Admins can delete for others" ON public.logs
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription OR Admins can view all" ON public.subscriptions
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can insert their own subscription OR Admins can insert for others" ON public.subscriptions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own subscription OR Admins can update for others" ON public.subscriptions
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own subscription OR Admins can delete for others" ON public.subscriptions
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles OR Admins can view all" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL TO authenticated USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- profiles (uses 'id' instead of 'user_id')
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile OR Admins can view all" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "profiles_insert_policy OR Admins can insert for others" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own profile OR Admins can update for others" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own profile OR Admins can delete for others" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- send_history
DROP POLICY IF EXISTS "Users can view their own send history" ON public.send_history;
DROP POLICY IF EXISTS "Users can insert their own send history" ON public.send_history;
DROP POLICY IF EXISTS "Users can update their own send history" ON public.send_history;
DROP POLICY IF EXISTS "Users can delete their own send history" ON public.send_history;
CREATE POLICY "Users can view their own send history OR Admins can view all" ON public.send_history
FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can insert their own send history OR Admins can insert for others" ON public.send_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own send history OR Admins can update for others" ON public.send_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own send history OR Admins can delete for others" ON public.send_history
FOR DELETE TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');


-- Etapa 2: Ajustar Lógica e RLS da Tabela `webhook_configs`
-- Remove existing policies
DROP POLICY IF EXISTS "Users can view their own webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can insert their own webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can update their own webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can delete their own webhook configs" ON public.webhook_configs;

-- New RLS policies for `webhook_configs`
-- SELECT: Allow any authenticated user to read (global config)
CREATE POLICY "Authenticated users can read webhook configs" ON public.webhook_configs
FOR SELECT TO authenticated USING (true);

-- INSERT, UPDATE, DELETE: Allow only Admins to manage
CREATE POLICY "Admins can manage webhook configs" ON public.webhook_configs
FOR ALL TO authenticated
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- The 'url_configs' table is for global configurations, so public read access for authenticated users is appropriate.
-- No changes needed for 'Authenticated users can read url configs' policy.