SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.user_roles ur ON au.id = ur.user_id
    WHERE ur.user_id IS NULL;