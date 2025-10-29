-- Tabela para mapear utilizadores a nomes de instância da Evolution API
CREATE TABLE public.user_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  instance_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disconnected', -- ex: 'disconnected', 'connecting', 'connected'
  qr_code_base64 TEXT, -- Para armazenar o QR Code temporariamente
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.user_instances ENABLE ROW LEVEL SECURITY;

-- Políticas: Utilizadores só podem gerir a sua própria instância
CREATE POLICY "Users can manage their own instance mapping" 
ON public.user_instances FOR ALL USING (auth.uid() = user_id);

-- Trigger para atualizar 'updated_at' automaticamente
CREATE TRIGGER update_user_instances_updated_at
BEFORE UPDATE ON public.user_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();