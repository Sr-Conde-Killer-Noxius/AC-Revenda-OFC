-- Create user_notification_status table
CREATE TABLE public.user_notification_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, notification_id)
);

-- Enable RLS for user_notification_status table (REQUIRED)
ALTER TABLE public.user_notification_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own notification status
CREATE POLICY "Users can manage their own notification status" ON public.user_notification_status
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);