-- Allow logging of update_user_status events in Acerto Certo webhook history
-- Drop existing CHECK constraint that only allows create/delete
ALTER TABLE public.acerto_certo_webhook_history
  DROP CONSTRAINT IF EXISTS acerto_certo_webhook_history_event_type_check;

-- Recreate CHECK constraint including update_user_status
ALTER TABLE public.acerto_certo_webhook_history
  ADD CONSTRAINT acerto_certo_webhook_history_event_type_check
  CHECK (event_type IN ('create_user', 'delete_user', 'update_user_status'));
