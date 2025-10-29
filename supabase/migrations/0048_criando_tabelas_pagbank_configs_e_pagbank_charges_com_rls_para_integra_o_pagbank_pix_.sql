-- Tabela: pagbank_configs
-- Armazena as credenciais da API do PagBank de forma segura.
CREATE TABLE public.pagbank_configs (
  id BIGINT PRIMARY KEY DEFAULT 1, -- Garante uma única linha de configuração
  pagbank_email TEXT NOT NULL,
  pagbank_token TEXT NOT NULL,
  pagbank_pix_key TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.pagbank_configs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para pagbank_configs: Apenas admins podem ler e escrever
CREATE POLICY "Admins can view PagBank configs" ON public.pagbank_configs
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert PagBank configs" ON public.pagbank_configs
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update PagBank configs" ON public.pagbank_configs
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Tabela: pagbank_charges
-- Rastreia cada cobrança PIX gerada.
CREATE TABLE public.pagbank_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  pagbank_charge_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, EXPIRED
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.pagbank_charges ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para pagbank_charges:
-- Usuários podem ler apenas suas próprias cobranças. Admins podem ler todas.
CREATE POLICY "Users can view their own PagBank charges" ON public.pagbank_charges
FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Ninguém pode inserir, atualizar ou deletar via RLS diretamente (apenas via Edge Functions com service_role_key)
-- As Edge Functions usarão o service_role_key para manipular esta tabela, ignorando RLS.