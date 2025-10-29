-- Add cpf (required) and pix_key to profiles with safe defaults
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cpf TEXT NOT NULL DEFAULT '';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- Optional: create index for lookups by user_id (already exists) and cpf for uniqueness later if needed
-- Note: Not enforcing uniqueness of cpf now to avoid blocking existing data
