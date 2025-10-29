DO $$
BEGIN
    -- Check if the column 'is_free' does NOT exist in public.subscriber_plans
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'subscriber_plans'
        AND column_name = 'is_free'
    ) THEN
        RAISE NOTICE 'Adding column "is_free" to "public.subscriber_plans"...';
        -- Add the column as nullable first
        ALTER TABLE public.subscriber_plans
        ADD COLUMN is_free BOOLEAN;

        -- Update existing rows to set a default value (FALSE)
        UPDATE public.subscriber_plans
        SET is_free = FALSE
        WHERE is_free IS NULL;

        -- Set the default value for new rows
        ALTER TABLE public.subscriber_plans
        ALTER COLUMN is_free SET DEFAULT FALSE;

        -- Finally, set the column to NOT NULL
        ALTER TABLE public.subscriber_plans
        ALTER COLUMN is_free SET NOT NULL;

        RAISE NOTICE 'Column "is_free" added to "public.subscriber_plans" with DEFAULT FALSE NOT NULL.';
    ELSE
        -- If the column exists, ensure it has the correct default and NOT NULL constraint
        RAISE NOTICE 'Column "is_free" already exists in "public.subscriber_plans". Checking constraints...';
        
        -- Check if it's nullable and fix if necessary
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'subscriber_plans'
            AND column_name = 'is_free'
            AND is_nullable = 'YES'
        ) THEN
            RAISE NOTICE 'Column "is_free" in "public.subscriber_plans" is nullable. Updating to NOT NULL.';
            UPDATE public.subscriber_plans
            SET is_free = FALSE
            WHERE is_free IS NULL;
            ALTER TABLE public.subscriber_plans
            ALTER COLUMN is_free SET NOT NULL;
        END IF;

        -- Check if the default is not 'false' and fix if necessary
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'subscriber_plans'
            AND column_name = 'is_free'
            AND column_default IS DISTINCT FROM 'false'
        ) THEN
            RAISE NOTICE 'Column "is_free" in "public.subscriber_plans" has incorrect default. Updating default.';
            ALTER TABLE public.subscriber_plans
            ALTER COLUMN is_free SET DEFAULT FALSE;
        END IF;
        RAISE NOTICE 'Constraints for "is_free" in "public.subscriber_plans" checked and applied if needed.';
    END IF;
END $$;