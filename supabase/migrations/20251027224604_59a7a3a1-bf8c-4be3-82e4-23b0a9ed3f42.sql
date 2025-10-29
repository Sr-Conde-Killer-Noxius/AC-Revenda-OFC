-- Adicionar coluna phone à tabela profiles (se não existir)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Atualizar coluna para NOT NULL com valor padrão para registros existentes
UPDATE public.profiles SET phone = '' WHERE phone IS NULL;
ALTER TABLE public.profiles ALTER COLUMN phone SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN phone SET DEFAULT '';