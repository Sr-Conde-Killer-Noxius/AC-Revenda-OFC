SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.profiles pp ON au.id = pp.id
    WHERE pp.id IS NULL;