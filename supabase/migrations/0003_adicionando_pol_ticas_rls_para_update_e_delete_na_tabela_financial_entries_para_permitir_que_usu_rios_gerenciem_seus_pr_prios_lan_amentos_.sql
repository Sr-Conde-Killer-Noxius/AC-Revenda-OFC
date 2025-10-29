-- Add UPDATE policy for financial_entries
CREATE POLICY "Users can update their own financial entries" ON public.financial_entries
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Add DELETE policy for financial_entries
CREATE POLICY "Users can delete their own financial entries" ON public.financial_entries
FOR DELETE TO authenticated USING (auth.uid() = user_id);