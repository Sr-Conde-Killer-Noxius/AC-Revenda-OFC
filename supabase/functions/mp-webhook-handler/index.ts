import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    console.log('MP Webhook received:', JSON.stringify(body));

    // Mercado Pago sends different notification types
    if (body.type !== 'payment' && body.action !== 'payment.updated') {
      console.log('Ignoring non-payment notification:', body.type, body.action);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    const paymentExternalId = String(body.data?.id);
    if (!paymentExternalId) {
      console.log('No payment ID in webhook');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    // Find our payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('mercado_pago_payments')
      .select('*')
      .eq('external_id', paymentExternalId)
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) {
      console.log('Payment not found for external_id:', paymentExternalId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    // Already processed
    if (payment.status === 'approved') {
      console.log('Payment already approved:', payment.id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    // Fetch payment status from MP using receiver's access token
    const { data: mpConfig } = await supabaseAdmin
      .from('mercado_pago_configs')
      .select('access_token')
      .eq('user_id', payment.receiver_id)
      .maybeSingle();

    if (!mpConfig) {
      console.error('MP config not found for receiver:', payment.receiver_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentExternalId}`, {
      headers: { 'Authorization': `Bearer ${mpConfig.access_token}` },
    });
    const mpData = await mpResponse.json();
    const mpStatus = mpData.status; // approved, rejected, pending, etc.

    console.log(`MP payment ${paymentExternalId} status: ${mpStatus}`);

    // Update payment status
    await supabaseAdmin
      .from('mercado_pago_payments')
      .update({ status: mpStatus })
      .eq('id', payment.id);

    if (mpStatus === 'approved') {
      // Execute credit transfer: deduct from receiver, add to payer
      const { data: receiverCredits } = await supabaseAdmin
        .from('user_credits')
        .select('balance, is_unlimited')
        .eq('user_id', payment.receiver_id)
        .maybeSingle();

      const receiverBalance = receiverCredits?.balance || 0;
      const receiverIsUnlimited = receiverCredits?.is_unlimited || false;

      if (!receiverIsUnlimited && receiverBalance < payment.amount_credits) {
        console.error(`Receiver ${payment.receiver_id} has insufficient credits: ${receiverBalance} < ${payment.amount_credits}`);
        // Mark as error state but don't fail the webhook
        await supabaseAdmin
          .from('mercado_pago_payments')
          .update({ status: 'error_insufficient_credits' })
          .eq('id', payment.id);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
      }

      // If unlimited, don't deduct from balance
      const newReceiverBalance = receiverIsUnlimited ? receiverBalance : receiverBalance - payment.amount_credits;

      const { data: payerCredits } = await supabaseAdmin
        .from('user_credits')
        .select('balance')
        .eq('user_id', payment.payer_id)
        .maybeSingle();

      const payerBalance = payerCredits?.balance || 0;
      const newPayerBalance = payerBalance + payment.amount_credits;

      // Update balances
      await supabaseAdmin
        .from('user_credits')
        .upsert({ user_id: payment.receiver_id, balance: newReceiverBalance, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      await supabaseAdmin
        .from('user_credits')
        .upsert({ user_id: payment.payer_id, balance: newPayerBalance, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      // Get names for descriptions
      const { data: receiverProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('user_id', payment.receiver_id)
        .maybeSingle();

      const { data: payerProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('user_id', payment.payer_id)
        .maybeSingle();

      const receiverName = receiverProfile?.full_name || 'N/A';
      const payerName = payerProfile?.full_name || 'N/A';

      // Record transactions
      await supabaseAdmin.from('credit_transactions').insert([
        {
          user_id: payment.receiver_id,
          transaction_type: 'credit_spent',
          amount: -payment.amount_credits,
          balance_after: newReceiverBalance,
          description: `Venda via Mercado Pago para ${payerName} (R$${payment.total_price})`,
          related_user_id: payment.payer_id,
          performed_by: payment.payer_id,
        },
        {
          user_id: payment.payer_id,
          transaction_type: 'credit_added',
          amount: payment.amount_credits,
          balance_after: newPayerBalance,
          description: `Compra via Mercado Pago de ${receiverName} (R$${payment.total_price})`,
          related_user_id: payment.receiver_id,
          performed_by: payment.payer_id,
        },
      ]);

      console.log(`Credits transferred: ${payment.amount_credits} from ${payment.receiver_id} to ${payment.payer_id}`);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in mp-webhook-handler:', error);
    // Always return 200 to MP to prevent retries on our errors
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
