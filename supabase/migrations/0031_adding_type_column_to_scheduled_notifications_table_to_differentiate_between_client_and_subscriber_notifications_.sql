ALTER TABLE public.scheduled_notifications
ADD COLUMN type TEXT DEFAULT 'client_notification' NOT NULL;

COMMENT ON COLUMN public.scheduled_notifications.type IS 'Type of notification: client_notification or subscriber_notification.';

-- Update RLS policies for scheduled_notifications to include the new 'type' column
-- Existing policy: Users can view their own scheduled notifications OR Admins can view all
DROP POLICY IF EXISTS "Users can view their own scheduled notifications OR Admins can " ON public.scheduled_notifications;
CREATE POLICY "Users can view their own scheduled notifications OR Admins can view all" ON public.scheduled_notifications
FOR SELECT TO authenticated USING (
  (auth.uid() = user_id AND type = 'client_notification') OR
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
);

-- Existing policy: Users can insert their own scheduled notifications OR Admins ca
DROP POLICY IF EXISTS "Users can insert their own scheduled notifications OR Admins ca" ON public.scheduled_notifications;
CREATE POLICY "Users can insert their own scheduled notifications OR Admins can insert for others" ON public.scheduled_notifications
FOR INSERT TO authenticated WITH CHECK (
  (auth.uid() = user_id AND type = 'client_notification') OR
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
);

-- Existing policy: Users can update their own scheduled notifications OR Admins ca
DROP POLICY IF EXISTS "Users can update their own scheduled notifications OR Admins ca" ON public.scheduled_notifications;
CREATE POLICY "Users can update their own scheduled notifications OR Admins can update for others" ON public.scheduled_notifications
FOR UPDATE TO authenticated USING (
  (auth.uid() = user_id AND type = 'client_notification') OR
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
);

-- Existing policy: Users can delete their own scheduled notifications OR Admins ca
DROP POLICY IF EXISTS "Users can delete their own scheduled notifications OR Admins ca" ON public.scheduled_notifications;
CREATE POLICY "Users can delete their own scheduled notifications OR Admins can delete for others" ON public.scheduled_notifications
FOR DELETE TO authenticated USING (
  (auth.uid() = user_id AND type = 'client_notification') OR
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
);