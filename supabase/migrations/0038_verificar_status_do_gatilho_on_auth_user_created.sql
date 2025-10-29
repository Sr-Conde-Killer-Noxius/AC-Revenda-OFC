SELECT event_object_table, event_manipulation, action_statement, action_timing, event_object_schema
    FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created';