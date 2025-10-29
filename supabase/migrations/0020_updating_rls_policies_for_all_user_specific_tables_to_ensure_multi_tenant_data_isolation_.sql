-- Enable RLS on all tables that store user-specific data if not already enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_api_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_qr_code_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_message_sender_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_logout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate or update RLS policies for 'clients' table
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage their own clients" ON public.clients
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recreate or update RLS policies for 'plans' table
DROP POLICY IF EXISTS "Users can manage their own plans" ON public.plans;
CREATE POLICY "Users can manage their own plans" ON public.plans
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recreate or update RLS policies for 'templates' table
DROP POLICY IF EXISTS "Users can manage their own templates" ON public.templates;
CREATE POLICY "Users can manage their own templates" ON public.templates
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recreate or update RLS policies for 'automations' table
DROP POLICY IF EXISTS "Users can manage their own automations" ON public.automations;
CREATE POLICY "Users can manage their own automations" ON public.automations
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recreate or update RLS policies for 'financial_entries' table
DROP POLICY IF EXISTS "Users can view their own financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Users can insert their own financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Users can update their own financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Users can delete their own financial entries" ON public.financial_entries;
CREATE POLICY "Users can view their own financial entries" ON public.financial_entries
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own financial entries" ON public.financial_entries
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own financial entries" ON public.financial_entries
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own financial entries" ON public.financial_entries
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'scheduled_notifications' table
DROP POLICY IF EXISTS "Users can view their own scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Users can insert their own scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Users can update their own scheduled notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "Users can delete their own scheduled notifications" ON public.scheduled_notifications;
CREATE POLICY "Users can view their own scheduled notifications" ON public.scheduled_notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scheduled notifications" ON public.scheduled_notifications
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scheduled notifications" ON public.scheduled_notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scheduled notifications" ON public.scheduled_notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'webhook_history' table
DROP POLICY IF EXISTS "Users can view their own webhook history" ON public.webhook_history;
DROP POLICY IF EXISTS "Users can insert their own webhook history" ON public.webhook_history;
CREATE POLICY "Users can view their own webhook history" ON public.webhook_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own webhook history" ON public.webhook_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Add UPDATE and DELETE policies for webhook_history
DROP POLICY IF EXISTS "Users can update their own webhook history" ON public.webhook_history;
DROP POLICY IF EXISTS "Users can delete their own webhook history" ON public.webhook_history;
CREATE POLICY "Users can update their own webhook history" ON public.webhook_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own webhook history" ON public.webhook_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'user_instances' table
DROP POLICY IF EXISTS "Users can manage their own instance mapping" ON public.user_instances;
CREATE POLICY "Users can manage their own instance mapping" ON public.user_instances
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recreate or update RLS policies for 'connection_status' table
DROP POLICY IF EXISTS "Users can view their own connection status" ON public.connection_status;
DROP POLICY IF EXISTS "Users can insert their own connection status" ON public.connection_status;
DROP POLICY IF EXISTS "Users can update their own connection status" ON public.connection_status;
DROP POLICY IF EXISTS "Users can delete their own connection status" ON public.connection_status;
CREATE POLICY "Users can view their own connection status" ON public.connection_status
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own connection status" ON public.connection_status
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own connection status" ON public.connection_status
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own connection status" ON public.connection_status
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'evolution_api_history' table
DROP POLICY IF EXISTS "evolution_api_history_select_policy" ON public.evolution_api_history;
DROP POLICY IF EXISTS "evolution_api_history_insert_policy" ON public.evolution_api_history;
DROP POLICY IF EXISTS "evolution_api_history_update_policy" ON public.evolution_api_history;
DROP POLICY IF EXISTS "evolution_api_history_delete_policy" ON public.evolution_api_history;
CREATE POLICY "evolution_api_history_select_policy" ON public.evolution_api_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "evolution_api_history_insert_policy" ON public.evolution_api_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "evolution_api_history_update_policy" ON public.evolution_api_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "evolution_api_history_delete_policy" ON public.evolution_api_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'n8n_qr_code_history' table
DROP POLICY IF EXISTS "n8n_qr_code_history_select_policy" ON public.n8n_qr_code_history;
DROP POLICY IF EXISTS "n8n_qr_code_history_insert_policy" ON public.n8n_qr_code_history;
DROP POLICY IF EXISTS "n8n_qr_code_history_update_policy" ON public.n8n_qr_code_history;
DROP POLICY IF EXISTS "n8n_qr_code_history_delete_policy" ON public.n8n_qr_code_history;
CREATE POLICY "n8n_qr_code_history_select_policy" ON public.n8n_qr_code_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n8n_qr_code_history_insert_policy" ON public.n8n_qr_code_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n8n_qr_code_history_update_policy" ON public.n8n_qr_code_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n8n_qr_code_history_delete_policy" ON public.n8n_qr_code_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'n8n_message_sender_history' table
DROP POLICY IF EXISTS "n8n_message_sender_history_select_policy" ON public.n8n_message_sender_history;
DROP POLICY IF EXISTS "n8n_message_sender_history_insert_policy" ON public.n8n_message_sender_history;
DROP POLICY IF EXISTS "n8n_message_sender_history_update_policy" ON public.n8n_message_sender_history;
DROP POLICY IF EXISTS "n8n_message_sender_history_delete_policy" ON public.n8n_message_sender_history;
CREATE POLICY "n8n_message_sender_history_select_policy" ON public.n8n_message_sender_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n8n_message_sender_history_insert_policy" ON public.n8n_message_sender_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n8n_message_sender_history_update_policy" ON public.n8n_message_sender_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "n8n_message_sender_history_delete_policy" ON public.n8n_message_sender_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'evolution_logout_history' table
DROP POLICY IF EXISTS "evolution_logout_history_select_policy" ON public.evolution_logout_history;
DROP POLICY IF EXISTS "evolution_logout_history_insert_policy" ON public.evolution_logout_history;
DROP POLICY IF EXISTS "evolution_logout_history_update_policy" ON public.evolution_logout_history;
DROP POLICY IF EXISTS "evolution_logout_history_delete_policy" ON public.evolution_logout_history;
CREATE POLICY "evolution_logout_history_select_policy" ON public.evolution_logout_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "evolution_logout_history_insert_policy" ON public.evolution_logout_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "evolution_logout_history_update_policy" ON public.evolution_logout_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "evolution_logout_history_delete_policy" ON public.evolution_logout_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'logs' table
DROP POLICY IF EXISTS "Users can view their own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can create their own logs" ON public.logs;
CREATE POLICY "Users can view their own logs" ON public.logs
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own logs" ON public.logs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Add UPDATE and DELETE policies for logs
DROP POLICY IF EXISTS "Users can update their own logs" ON public.logs;
DROP POLICY IF EXISTS "Users can delete their own logs" ON public.logs;
CREATE POLICY "Users can update their own logs" ON public.logs
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own logs" ON public.logs
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'subscriptions' table
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.subscriptions
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Add INSERT and DELETE policies for subscriptions
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscription" ON public.subscriptions
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'user_roles' table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Add INSERT, UPDATE, DELETE policies for user_roles
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete their own roles" ON public.user_roles;
CREATE POLICY "Users can insert their own roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own roles" ON public.user_roles
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own roles" ON public.user_roles
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate or update RLS policies for 'profiles' table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);
-- Add DELETE policy for profiles
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id);

-- Recreate or update RLS policies for 'webhook_configs' table
DROP POLICY IF EXISTS "Users can view their own webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can insert their own webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can update their own webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can delete their own webhook configs" ON public.webhook_configs;
CREATE POLICY "Users can view their own webhook configs" ON public.webhook_configs
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own webhook configs" ON public.webhook_configs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own webhook configs" ON public.webhook_configs
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own webhook configs" ON public.webhook_configs
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for 'send_history' table
DROP POLICY IF EXISTS "Users can view their own send history" ON public.send_history;
DROP POLICY IF EXISTS "Users can insert their own send history" ON public.send_history;
DROP POLICY IF EXISTS "Users can update their own send history" ON public.send_history;
DROP POLICY IF EXISTS "Users can delete their own send history" ON public.send_history;
CREATE POLICY "Users can view their own send history" ON public.send_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own send history" ON public.send_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own send history" ON public.send_history
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own send history" ON public.send_history
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- The 'url_configs' table is for global configurations, so public read access for authenticated users is appropriate.
-- No changes needed for 'Authenticated users can read url configs' policy.