ALTER TABLE public.profiles
ADD COLUMN external_id TEXT UNIQUE;

-- Opcional: Adicionar índice para buscas mais rápidas por external_id
CREATE INDEX IF NOT EXISTS profiles_external_id_idx ON public.profiles (external_id);