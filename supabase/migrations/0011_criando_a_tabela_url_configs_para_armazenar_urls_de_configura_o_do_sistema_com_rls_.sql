-- Tabela para armazenar URLs de configuração
CREATE TABLE public.url_configs (
  id INT PRIMARY KEY DEFAULT 1,
  n8n_webhook_url TEXT NOT NULL,
  evolution_listener_url TEXT NOT NULL,
  -- Apenas uma linha pode existir nesta tabela
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.url_configs ENABLE ROW LEVEL SECURITY;

-- Políticas: Apenas utilizadores autenticados podem ler.
CREATE POLICY "Authenticated users can read url configs" 
ON public.url_configs FOR SELECT TO authenticated USING (true);