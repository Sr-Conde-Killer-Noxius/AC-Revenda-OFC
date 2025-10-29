-- Criar tabela para controle de acesso às páginas
CREATE TABLE public.page_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,
  page_title TEXT NOT NULL,
  page_url TEXT NOT NULL,
  role app_role NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (page_key, role)
);

-- Habilitar RLS
ALTER TABLE public.page_access_control ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Admins podem fazer tudo
CREATE POLICY "Admins podem gerenciar controle de páginas"
ON public.page_access_control
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Masters e Resellers podem ver suas próprias permissões
CREATE POLICY "Masters podem ver permissões de master"
ON public.page_access_control
FOR SELECT
USING (has_role(auth.uid(), 'master'::app_role) AND role = 'master'::app_role);

CREATE POLICY "Resellers podem ver permissões de reseller"
ON public.page_access_control
FOR SELECT
USING (has_role(auth.uid(), 'reseller'::app_role) AND role = 'reseller'::app_role);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_page_access_control_updated_at
BEFORE UPDATE ON public.page_access_control
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Popular dados iniciais
-- Páginas para Master (habilitadas por padrão)
INSERT INTO public.page_access_control (page_key, page_title, page_url, role, is_enabled) VALUES
  ('revenda', 'Gerenciar Revendedores', '/revenda', 'master', true),
  ('planos', 'Planos e Preços', '/planos', 'master', true),
  ('carteira', 'Carteira de Créditos', '/carteira', 'master', true),
  ('templates', 'Templates de Mensagem', '/templates', 'master', true),
  ('whatsapp', 'Conexão WhatsApp', '/whatsapp', 'master', true),
  ('webhooks', 'Configuração de Webhooks', '/webhooks', 'master', false),
  ('acerto-certo', 'Integração Acerto Certo', '/settings/acerto-certo-integration', 'master', false);

-- Páginas para Reseller (desabilitadas por padrão, exceto configurações que não é controlável)
INSERT INTO public.page_access_control (page_key, page_title, page_url, role, is_enabled) VALUES
  ('revenda', 'Gerenciar Revendedores', '/revenda', 'reseller', false),
  ('planos', 'Planos e Preços', '/planos', 'reseller', false),
  ('carteira', 'Carteira de Créditos', '/carteira', 'reseller', false),
  ('templates', 'Templates de Mensagem', '/templates', 'reseller', false),
  ('whatsapp', 'Conexão WhatsApp', '/whatsapp', 'reseller', false),
  ('webhooks', 'Configuração de Webhooks', '/webhooks', 'reseller', false),
  ('acerto-certo', 'Integração Acerto Certo', '/settings/acerto-certo-integration', 'reseller', false);