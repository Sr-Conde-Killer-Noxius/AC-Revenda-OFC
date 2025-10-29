-- Update the DS ADM user to be an admin
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '5a63d6b7-b25a-4ddf-a80f-169de767a6bd';