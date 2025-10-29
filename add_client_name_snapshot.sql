-- Execute este SQL no Supabase Dashboard > SQL Editor
-- Este script adiciona a coluna client_name_snapshot para preservar nomes de clientes deletados

-- Add client_name_snapshot column to webhook_history table
ALTER TABLE webhook_history 
ADD COLUMN IF NOT EXISTS client_name_snapshot TEXT;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_webhook_history_client_name_snapshot 
ON webhook_history(client_name_snapshot);

-- Add a comment to explain the purpose
COMMENT ON COLUMN webhook_history.client_name_snapshot IS 
'Snapshot of the client name at the time of the webhook call. Used to preserve history even if client is deleted.';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'webhook_history' 
AND column_name = 'client_name_snapshot';
