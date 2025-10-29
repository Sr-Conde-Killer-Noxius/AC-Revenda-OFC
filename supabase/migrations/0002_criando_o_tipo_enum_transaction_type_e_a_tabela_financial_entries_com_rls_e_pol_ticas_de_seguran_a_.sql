-- Create ENUM for transaction types
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create financial_entries table
CREATE TABLE public.financial_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  type public.transaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- Policies for financial_entries
CREATE POLICY "Users can view their own financial entries" ON public.financial_entries
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial entries" ON public.financial_entries
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- No update or delete policies by default for financial entries to maintain an immutable ledger.
-- If updates/deletes are needed, specific policies should be added.