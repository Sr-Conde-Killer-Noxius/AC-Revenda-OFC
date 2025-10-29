// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-ignore
import { DateTime } from 'https://esm.sh/luxon@3.4.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Edge Function: User authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Edge Function: User authenticated, userId:', user.id);

    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: adminRoleData, error: adminRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (adminRoleError || adminRoleData?.role !== 'admin') {
      console.warn('Edge Function: Unauthorized access attempt by non-admin user:', user.id);
      return new Response(JSON.stringify({ error: 'Access denied: Admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Edge Function: Admin user confirmed.');

    const { subscriptionId, targetUserId, currentStatus, price } = await req.json();

    if (!subscriptionId || !targetUserId || !currentStatus || price === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields for setting due date to today.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Calculate today's date in YYYY-MM-DD format (local)
    const todayDate = DateTime.local().toISODate();

    // 2. Determine new status
    const newStatus = currentStatus === 'inactive' ? 'active' : currentStatus;

    // 3. Update subscription
    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ next_billing_date: todayDate, status: newStatus })
      .eq('id', subscriptionId)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 4. Record financial entry (optional, but good for tracking)
    // REMOVIDO: A criação de entrada financeira para "Vencimento para Hoje"
    // const { error: financialEntryError } = await supabaseAdmin
    //   .from('admin_financial_entries')
    //   .insert({
    //     admin_user_id: user.id,
    //     subscriber_id: targetUserId,
    //     description: `Vencimento para Hoje - Assinatura`,
    //     value: price, // Assuming this is a payment received
    //     type: 'credit',
    //   });

    // if (financialEntryError) {
    //   console.error('Edge Function: Error recording financial entry:', financialEntryError.message);
    //   // Do not throw, as subscription update is more critical
    // }

    return new Response(JSON.stringify({ success: true, data: updatedSubscription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge Function: Error in set-subscriber-due-today:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});