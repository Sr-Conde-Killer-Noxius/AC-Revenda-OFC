-- Migração: Tornando user_id da tabela templates nulável
ALTER TABLE public.templates
ALTER COLUMN user_id DROP NOT NULL;

-- Migração: Adicionando pix_key à tabela profiles (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pix_key') THEN
        ALTER TABLE public.profiles ADD COLUMN pix_key TEXT NULL;
        COMMENT ON COLUMN public.profiles.pix_key IS 'Chave PIX do usuário para recebimento de pagamentos.';
    END IF;
END
$$;