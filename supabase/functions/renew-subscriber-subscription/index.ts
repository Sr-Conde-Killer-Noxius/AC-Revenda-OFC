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

    const { subscriptionId, targetUserId, planName, currentNextBillingDate, price } = await req.json();

    if (!subscriptionId || !targetUserId || !planName || !currentNextBillingDate || price === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields for subscription renewal.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch subscriber plan details to get period_days
    const { data: planData, error: planError } = await supabaseAdmin
      .from('subscriber_plans')
      .select('period_days')
      .eq('name', planName)
      .single();

    if (planError || !planData) {
      console.error('Edge Function: Error fetching subscriber plan:', planError?.message || 'Plan not found');
      throw new Error(`Subscriber plan "${planName}" not found.`);
    }

    const periodDays = planData.period_days;

    // 2. Calculate new next_billing_date using Luxon
    const currentDueDate = DateTime.fromISO(currentNextBillingDate, { zone: 'local' }).startOf('day');
    const newNextBillingDate = currentDueDate.plus({ days: periodDays }).toISODate();

    // 3. Update subscription
    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ next_billing_date: newNextBillingDate, status: 'active' })
      .eq('id', subscriptionId)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (updateError) throw updateError;

    // NOVO: Buscar o nome do assinante
    const { data: subscriberProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', targetUserId)
      .single();

    const subscriberName = subscriberProfile?.name || 'Assinante Desconhecido';

    // 4. Record financial entry
    const { error: financialEntryError } = await supabaseAdmin
      .from('admin_financial_entries')
      .insert({
        admin_user_id: user.id,
        subscriber_id: targetUserId,
        description: `Renovação de Assinatura - ${planName} (${subscriberName})`, // Descrição atualizada
        value: price,
        type: 'credit',
      });

    if (financialEntryError) {
      console.error('Edge Function: Error recording financial entry:', financialEntryError.message);
      // Do not throw, as subscription update is more critical
    }

    return new Response(JSON.stringify({ success: true, data: updatedSubscription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge Function: Error in renew-subscriber-subscription:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});