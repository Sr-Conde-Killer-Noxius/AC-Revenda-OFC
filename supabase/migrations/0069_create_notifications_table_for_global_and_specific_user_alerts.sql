-- Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'global', -- 'global' or 'specific'
  target_user_ids UUID[], -- Array of profiles.id if target_type is 'specific'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for notifications table (REQUIRED)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications" ON public.notifications
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- RLS Policy: Users can view global or targeted notifications
CREATE POLICY "Users can view global or targeted notifications" ON public.notifications
FOR SELECT TO authenticated
USING (target_type = 'global' OR auth.uid() = ANY(target_user_ids));