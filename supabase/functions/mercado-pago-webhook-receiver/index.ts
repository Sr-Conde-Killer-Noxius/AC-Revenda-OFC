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
    console.log('Mercado Pago Webhook received payload:', JSON.stringify(payload, null, 2));

    // Mercado Pago sends different event types. We are interested in 'payment' events.
    // The actual payment ID is usually in payload.data.id for payment events.
    const eventType = payload.type;
    const paymentId = payload.data?.id; // This is the Mercado Pago payment ID

    if (eventType !== 'payment' || !paymentId) {
      console.warn('Mercado Pago Webhook: Not a payment event or missing payment ID. Skipping.');
      return new Response(JSON.stringify({ message: 'Not a relevant event type or missing payment ID.' }), {
        status: 200, // Return 200 to acknowledge receipt, even if not processed
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch payment details from Mercado Pago API to get the full status
    console(`Mercado Pago Webhook: Fetching payment details for ID: ${paymentId}`);
    const { data: mpConfig, error: configError } = await supabaseAdmin
      .from('mercado_pago_configs')
      .select('mercado_pago_access_token')
      .eq('id', 1)
      .single();

    if (configError || !mpConfig) {
      console.error('Mercado Pago Webhook: Mercado Pago config not found:', configError?.message);
      throw new Error('Mercado Pago configuration not found. Please contact support.');
    }
    const mercadoPagoAccessToken = mpConfig.mercado_pago_access_token;
    const paymentApiUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;

    const mpResponse = await fetch(paymentApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
      },
    });

    const mpPaymentData = await mpResponse.json();
    console.log('Mercado Pago Webhook: Fetched payment data:', JSON.stringify(mpPaymentData, null, 2));

    if (!mpResponse.ok) {
      console.error('Mercado Pago Webhook: Error fetching payment details from MP API:', mpPaymentData);
      throw new Error(`Failed to fetch payment details from Mercado Pago: ${mpPaymentData.message || mpResponse.statusText}`);
    }

    const mpPaymentStatus = mpPaymentData.status; // e.g., 'approved', 'pending', 'rejected', 'cancelled'
    const externalReference = mpPaymentData.external_reference; // Our reference_id
    const transactionAmount = mpPaymentData.transaction_amount;

    if (!externalReference) {
      console.error('Mercado Pago Webhook: Missing external_reference in payment data.');
      return new Response(JSON.stringify({ error: 'Missing external_reference in payment data.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract subscription_id from external_reference (e.g., "sub-UUID-TIMESTAMP")
    const subscriptionIdMatch = externalReference.match(/sub-([a-f0-9-]+)-\d+/);
    const subscription_id = subscriptionIdMatch ? subscriptionIdMatch[1] : null;

    if (!subscription_id) {
      console.error('Mercado Pago Webhook: Could not extract subscription_id from external_reference:', externalReference);
      return new Response(JSON.stringify({ error: 'Could not extract subscription_id from external_reference.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Find the corresponding charge in mercado_pago_charges
    const { data: charge, error: chargeError } = await supabaseAdmin
      .from('mercado_pago_charges')
      .select('id, user_id, subscription_id, status, value')
      .eq('mercado_pago_payment_id', String(paymentId))
      .eq('subscription_id', subscription_id)
      .single();

    if (chargeError || !charge) {
      console.error(`Mercado Pago Webhook: Charge ${paymentId} not found in DB or error:`, chargeError?.message);
      return new Response(JSON.stringify({ error: `Charge ${paymentId} not found.` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Process if status is 'approved' and current DB status is 'pending'
    if (mpPaymentStatus === 'approved' && charge.status === 'pending') {
      console.log(`Mercado Pago Webhook: Processing 'approved' status for charge ${paymentId}.`);

      // Update status in mercado_pago_charges
      const { error: updateChargeError } = await supabaseAdmin
        .from('mercado_pago_charges')
        .update({ status: 'approved' })
        .eq('id', charge.id);

      if (updateChargeError) {
        console.error('Mercado Pago Webhook: Error updating mercado_pago_charges status:', updateChargeError.message);
        throw new Error(`Failed to update charge status: ${updateChargeError.message}`);
      }

      // Get subscription details
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, price, next_billing_date, subscriber_plans(period_days)')
        .eq('id', charge.subscription_id)
        .single();

      if (subError || !subscription) {
        console.error('Mercado Pago Webhook: Subscription not found or error:', subError?.message);
        throw new Error(`Subscription ${charge.subscription_id} not found.`);
      }

      const planData = Array.isArray(subscription.subscriber_plans) ? subscription.subscriber_plans[0] : subscription.subscriber_plans;
      const periodDays = planData?.period_days;

      if (!periodDays) {
        console.error('Mercado Pago Webhook: Plan period_days not found for subscription:', subscription.id);
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
        console.error('Mercado Pago Webhook: Error updating subscription:', updateSubError.message);
        throw new Error(`Failed to update subscription: ${updateSubError.message}`);
      }

      // Get admin_user_id from mercado_pago_configs (assuming the admin who set it up is the one to log revenue)
      const { data: adminConfig, error: adminConfigError } = await supabaseAdmin
        .from('mercado_pago_configs')
        .select('id') // Just need any ID to represent the admin
        .eq('id', 1)
        .single();

      if (adminConfigError || !adminConfig) {
        console.warn('Mercado Pago Webhook: Admin Mercado Pago config not found for logging financial entry. Using generic admin ID.');
      }
      const adminUserId = adminConfig?.id ? String(adminConfig.id) : '00000000-0000-0000-0000-000000000000'; // Fallback to a generic ID

      // Create new entry in admin_financial_entries
      const { error: financialEntryError } = await supabaseAdmin
        .from('admin_financial_entries')
        .insert({
          admin_user_id: adminUserId, // The admin who owns the platform
          subscriber_id: charge.user_id, // The user who paid
          description: `Pagamento PIX - Renovação de Assinatura (${subscription.plan_name})`,
          value: transactionAmount, // Use transactionAmount from MP response
          type: 'credit',
        });

      if (financialEntryError) {
        console.error('Mercado Pago Webhook: Error creating admin financial entry:', financialEntryError.message);
        // Do not throw, as the core payment processing is done
      }

      console.log(`Mercado Pago Webhook: Subscription ${subscription.id} renewed and financial entry created.`);
    } else if (mpPaymentStatus === 'rejected' || mpPaymentStatus === 'cancelled' || mpPaymentStatus === 'refunded') {
      console.log(`Mercado Pago Webhook: Processing ${mpPaymentStatus} status for charge ${paymentId}.`);
      const { error: updateChargeError } = await supabaseAdmin
        .from('mercado_pago_charges')
        .update({ status: mpPaymentStatus })
        .eq('id', charge.id);

      if (updateChargeError) {
        console.error(`Mercado Pago Webhook: Error updating mercado_pago_charges status to ${mpPaymentStatus}:`, updateChargeError.message);
      }
    } else {
      console.log(`Mercado Pago Webhook: Charge ${paymentId} status is ${charge.status} in DB, received ${mpPaymentStatus}. No action taken.`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Error in mercado-pago-webhook-receiver:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});