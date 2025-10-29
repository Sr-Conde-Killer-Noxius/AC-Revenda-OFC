-- Create admin_financial_entries table
CREATE TABLE public.admin_financial_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  type public.transaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for admin_financial_entries
ALTER TABLE public.admin_financial_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_financial_entries (Admin only)
CREATE POLICY "Admins can view all admin financial entries" ON public.admin_financial_entries
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can insert admin financial entries" ON public.admin_financial_entries
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update admin financial entries" ON public.admin_financial_entries
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete admin financial entries" ON public.admin_financial_entries
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));


-- Create subscriber_plans table
CREATE TABLE public.subscriber_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  period_days INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for subscriber_plans
ALTER TABLE public.subscriber_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriber_plans (Admin only)
CREATE POLICY "Admins can view all subscriber plans" ON public.subscriber_plans
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can insert subscriber plans" ON public.subscriber_plans
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update subscriber plans" ON public.subscriber_plans
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete subscriber plans" ON public.subscriber_plans
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));


-- Create subscriber_templates table
CREATE TABLE public.subscriber_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be NULL for global templates
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type public.template_type DEFAULT 'normal' NOT NULL, -- 'normal' or 'global'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for subscriber_templates
ALTER TABLE public.subscriber_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriber_templates (Admin only)
CREATE POLICY "Admins can view all subscriber templates" ON public.subscriber_templates
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can insert subscriber templates" ON public.subscriber_templates
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update subscriber templates" ON public.subscriber_templates
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete subscriber templates" ON public.subscriber_templates
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));


-- Create subscriber_automations table
CREATE TABLE public.subscriber_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  days_offset INTEGER NOT NULL,
  subscriber_template_id UUID REFERENCES public.subscriber_templates(id) ON DELETE CASCADE,
  subscriber_ids UUID[] NOT NULL, -- Array of profiles.id
  scheduled_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for subscriber_automations
ALTER TABLE public.subscriber_automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriber_automations (Admin only)
CREATE POLICY "Admins can view all subscriber automations" ON public.subscriber_automations
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can insert subscriber automations" ON public.subscriber_automations
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update subscriber automations" ON public.subscriber_automations
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete subscriber automations" ON public.subscriber_automations
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- Add triggers for updated_at columns
CREATE TRIGGER update_subscriber_plans_updated_at
BEFORE UPDATE ON public.subscriber_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriber_templates_updated_at
BEFORE UPDATE ON public.subscriber_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriber_automations_updated_at
BEFORE UPDATE ON public.subscriber_automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();