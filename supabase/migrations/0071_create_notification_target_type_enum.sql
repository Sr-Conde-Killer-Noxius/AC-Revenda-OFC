DO $$ BEGIN
  CREATE TYPE public.notification_target_type AS ENUM ('global', 'specific');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;