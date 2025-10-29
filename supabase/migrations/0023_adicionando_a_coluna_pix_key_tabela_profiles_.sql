ALTER TABLE public.profiles
ADD COLUMN pix_key TEXT NULL;

COMMENT ON COLUMN public.profiles.pix_key IS 'Chave PIX do usuário para recebimento de pagamentos.';