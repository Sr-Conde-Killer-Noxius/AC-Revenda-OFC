ALTER TABLE public.profiles
ADD COLUMN tax_id TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.profiles.tax_id IS 'CPF ou CNPJ do usuário (apenas números). Obrigatório.';

-- Atualiza registros existentes para ter um valor padrão válido (ex: '00000000000')
-- Isso é necessário porque a coluna é NOT NULL e pode haver perfis existentes sem esse campo.
-- O usuário deverá atualizar seu perfil com um CPF/CNPJ real.
UPDATE public.profiles
SET tax_id = '00000000000'
WHERE tax_id IS NULL OR tax_id = '';