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

  const supabaseAdmin = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const payload = await req.json();
    console.log('PagBank Webhook received payload:', JSON.stringify(payload, null, 2));

    // Mock PagBank payload structure for demonstration
    // In a real scenario, you would parse the actual PagBank webhook payload
    const pagbankChargeId = payload.charge_id || payload.id; // Assuming charge_id or id is present
    const pagbankStatus = payload.status; // Assuming status is 'PAID', 'PENDING', 'EXPIRED'

    if (!pagbankChargeId || !pagbankStatus) {
      console.error('PagBank Webhook: Missing charge_id or status in payload.');
      return new Response(JSON.stringify({ error: 'Missing charge_id or status in payload.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Find the corresponding charge in pagbank_charges
    const { data: charge, error: chargeError } = await supabaseAdmin
      .from('pagbank_charges')
      .select('id, user_id, subscription_id, status, value')
      .eq('pagbank_charge_id', pagbankChargeId)
      .single();

    if (chargeError || !charge) {
      console.error(`PagBank Webhook: Charge ${pagbankChargeId} not found in DB or error:`, chargeError?.message);
      return new Response(JSON.stringify({ error: `Charge ${pagbankChargeId} not found.` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Process if status is PAID and current DB status is PENDING
    if (pagbankStatus === 'PAID' && charge.status === 'PENDING') {
      console.log(`PagBank Webhook: Processing PAID status for charge ${pagbankChargeId}.`);

      // Update status in pagbank_charges
      const { error: updateChargeError } = await supabaseAdmin
        .from('pagbank_charges')
        .update({ status: 'PAID' })
        .eq('id', charge.id);

      if (updateChargeError) {
        console.error('PagBank Webhook: Error updating pagbank_charges status:', updateChargeError.message);
        throw new Error(`Failed to update charge status: ${updateChargeError.message}`);
      }

      // Get subscription details
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, price, next_billing_date, subscriber_plans(period_days)')
        .eq('id', charge.subscription_id)
        .single();

      if (subError || !subscription) {
        console.error('PagBank Webhook: Subscription not found or error:', subError?.message);
        throw new Error(`Subscription ${charge.subscription_id} not found.`);
      }

      const planData = Array.isArray(subscription.subscriber_plans) ? subscription.subscriber_plans[0] : subscription.subscriber_plans;
      const periodDays = planData?.period_days;

      if (!periodDays) {
        console.error('PagBank Webhook: Plan period_days not found for subscription:', subscription.id);
        throw new Error(`Plan period_days not found for subscription ${subscription.id}.`);
      }

      // Calculate new next_billing_date
      const currentDueDate = DateTime.fromISO(subscription.next_billing_date, { zone: 'local' }).startOf('day');
      const newNextBillingDate = currentDueDate.plus({ days: periodDays }).toISODate();

      // Update subscription
      const { error: updateSubError } = await supabaseAdmin
        .from('subscriptions')
        .update({ next_billing_date: newNextBillingDate, status: 'active' })
        .eq('id', subscription.id);

      if (updateSubError) {
        console.error('PagBank Webhook: Error updating subscription:', updateSubError.message);
        throw new Error(`Failed to update subscription: ${updateSubError.message}`);
      }

      // Get admin_user_id from pagbank_configs (assuming the admin who set it up is the one to log revenue)
      const { data: adminConfig, error: adminConfigError } = await supabaseAdmin
        .from('pagbank_configs')
        .select('id') // Just need any ID to represent the admin
        .eq('id', 1)
        .single();

      if (adminConfigError || !adminConfig) {
        console.warn('PagBank Webhook: Admin PagBank config not found for logging financial entry. Using generic admin ID.');
      }
      const adminUserId = adminConfig?.id ? String(adminConfig.id) : '00000000-0000-0000-0000-000000000000'; // Fallback to a generic ID

      // Create new entry in admin_financial_entries
      const { error: financialEntryError } = await supabaseAdmin
        .from('admin_financial_entries')
        .insert({
          admin_user_id: adminUserId, // The admin who owns the platform
          subscriber_id: charge.user_id, // The user who paid
          description: `Pagamento PIX - Renovação de Assinatura (${subscription.plan_name})`,
          value: charge.value,
          type: 'credit',
        });

      if (financialEntryError) {
        console.error('PagBank Webhook: Error creating admin financial entry:', financialEntryError.message);
        // Do not throw, as the core payment processing is done
      }

      console.log(`PagBank Webhook: Subscription ${subscription.id} renewed and financial entry created.`);
    } else if (pagbankStatus === 'EXPIRED' && charge.status === 'PENDING') {
      console.log(`PagBank Webhook: Processing EXPIRED status for charge ${pagbankChargeId}.`);
      const { error: updateChargeError } = await supabaseAdmin
        .from('pagbank_charges')
        .update({ status: 'EXPIRED' })
        .eq('id', charge.id);

      if (updateChargeError) {
        console.error('PagBank Webhook: Error updating pagbank_charges status to EXPIRED:', updateChargeError.message);
      }
    } else {
      console.log(`PagBank Webhook: Charge ${pagbankChargeId} status is ${charge.status} in DB, received ${pagbankStatus}. No action taken.`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Error in pagbank-webhook-receiver:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});