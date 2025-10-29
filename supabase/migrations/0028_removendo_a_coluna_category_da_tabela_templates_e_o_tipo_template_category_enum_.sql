-- 1. Remover a coluna 'category' da tabela 'templates'
ALTER TABLE public.templates DROP COLUMN category;

-- 2. Remover o tipo ENUM 'template_category'
DROP TYPE public.template_category;