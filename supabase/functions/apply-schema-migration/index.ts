// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('apply-schema-migration: Starting schema migration...');

    // Connect directly to PostgreSQL to execute DDL
    const client = new Client({
      // @ts-ignore
      hostname: Deno.env.get('SUPABASE_DB_HOST') ?? '',
      // @ts-ignore
      port: parseInt(Deno.env.get('SUPABASE_DB_PORT') ?? '5432'),
      // @ts-ignore
      user: 'postgres',
      // @ts-ignore
      password: Deno.env.get('SUPABASE_DB_PASSWORD') ?? '',
      database: 'postgres',
    });

    await client.connect();

    // Add column if it doesn't exist
    await client.queryArray(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'webhook_history' 
          AND column_name = 'client_name_snapshot'
        ) THEN
          ALTER TABLE webhook_history ADD COLUMN client_name_snapshot TEXT;
          CREATE INDEX idx_webhook_history_client_name_snapshot ON webhook_history(client_name_snapshot);
          COMMENT ON COLUMN webhook_history.client_name_snapshot IS 'Snapshot of the client name at the time of the webhook call. Used to preserve history even if client is deleted.';
        END IF;
      END $$;
    `);

    await client.end();

    console.log('apply-schema-migration: Schema migration completed');

    // Now populate existing records using Supabase client
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // This function is called by useDashboardStats, which is user-authenticated.
    // We need to get the user from the request to filter the population.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // If no auth header, this is likely a direct invocation without user context.
      // For migration, we might want to process all, but for data population, it should be user-specific.
      // For now, we'll skip population if no user context.
      console.warn('apply-schema-migration: No Authorization header found. Skipping data population for specific user.');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Schema migration completed. Data population skipped due to missing user context.',
          recordsUpdated: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUserClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      console.error('apply-schema-migration: User authentication failed for data population:', userError?.message);
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated for data population' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    // Fetch user role
    const { data: userRoleData, error: userRoleError } = await supabaseUserClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (userRoleError && userRoleError.code !== 'PGRST116') {
      console.error('apply-schema-migration: Error fetching user role for data population:', userRoleError.message);
      throw userRoleError;
    }
    const userRole = userRoleData?.role || 'user';

    let historyRecordsQuery = supabaseAdmin
      .from('webhook_history')
      .select('id, client_id, clients(name)')
      .is('client_name_snapshot', null)
      .not('client_id', 'is', null);

    // Apply user_id filter for non-admin users during data population
    if (userRole !== 'admin') {
      historyRecordsQuery = historyRecordsQuery.eq('user_id', userId);
    }

    const { data: historyRecords } = await historyRecordsQuery;

    let updatedCount = 0;
    if (historyRecords && historyRecords.length > 0) {
      for (const record of historyRecords) {
        const client = Array.isArray(record.clients) ? record.clients[0] : record.clients;
        if (client?.name) {
          await supabaseAdmin
            .from('webhook_history')
            .update({ client_name_snapshot: client.name })
            .eq('id', record.id);
          updatedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Schema migration and data population completed',
        recordsUpdated: updatedCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('apply-schema-migration: Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});