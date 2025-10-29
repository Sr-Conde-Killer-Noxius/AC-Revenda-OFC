-- Create the enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pagbank_environment') THEN
        CREATE TYPE public.pagbank_environment AS ENUM ('sandbox', 'production');
    END IF;
END
$$;

-- Add the 'environment' column to 'pagbank_configs' table
ALTER TABLE public.pagbank_configs
ADD COLUMN environment public.pagbank_environment NOT NULL DEFAULT 'sandbox'::public.pagbank_environment;

-- Add a comment to the new column
COMMENT ON COLUMN public.pagbank_configs.environment IS 'Ambiente da API PagBank a ser utilizado (sandbox ou production).';