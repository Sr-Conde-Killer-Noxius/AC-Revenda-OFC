-- 1. Remover a coluna 'category' da tabela 'templates' (se existir)
ALTER TABLE public.templates DROP COLUMN IF EXISTS category;

-- 2. Remover o tipo ENUM 'template_category' (se existir)
DROP TYPE IF EXISTS public.template_category;