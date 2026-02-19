import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: payerUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !payerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payerId = payerUser.id;
    const { quantity } = await req.json();

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error('Quantidade inválida. Deve ser um número inteiro positivo.');
    }

    // Find the receiver (who created this payer) via profiles.created_by
    const { data: payerProfile, error: payerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('created_by, full_name')
      .eq('user_id', payerId)
      .maybeSingle();

    if (payerProfileError) throw payerProfileError;
    if (!payerProfile?.created_by) {
      throw new Error('Você não possui um superior configurado no sistema.');
    }

    const receiverId = payerProfile.created_by;

    // Get receiver's MP config
    const { data: mpConfig, error: mpConfigError } = await supabaseAdmin
      .from('mercado_pago_configs')
      .select('access_token, unit_price, is_active')
      .eq('user_id', receiverId)
      .maybeSingle();

    if (mpConfigError) throw mpConfigError;
    if (!mpConfig) {
      throw new Error('Seu superior não configurou o Mercado Pago.');
    }
    if (!mpConfig.is_active) {
      throw new Error('A integração Mercado Pago do seu superior está desativada.');
    }

    const totalPrice = Number(mpConfig.unit_price) * quantity;

    // Check if receiver has enough credits (skip if unlimited)
    const { data: receiverCredits } = await supabaseAdmin
      .from('user_credits')
      .select('balance, is_unlimited')
      .eq('user_id', receiverId)
      .maybeSingle();

    const receiverBalance = receiverCredits?.balance || 0;
    const receiverIsUnlimited = receiverCredits?.is_unlimited || false;
    if (!receiverIsUnlimited && receiverBalance < quantity) {
      throw new Error('Seu superior não possui créditos suficientes no momento.');
    }

    // Create PIX payment via Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpConfig.access_token}`,
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: totalPrice,
        description: `Compra de ${quantity} crédito(s) - Acerto Certo`,
        payment_method_id: 'pix',
        payer: {
          email: payerUser.email || 'cliente@acertocerto.com',
        },
        notification_url: `${supabaseUrl}/functions/v1/mp-webhook-handler`,
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago API error:', JSON.stringify(mpData));
      throw new Error(mpData.message || 'Erro ao criar pagamento no Mercado Pago.');
    }

    const pixInfo = mpData.point_of_interaction?.transaction_data;

    // Save payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('mercado_pago_payments')
      .insert({
        external_id: String(mpData.id),
        payer_id: payerId,
        receiver_id: receiverId,
        amount_credits: quantity,
        total_price: totalPrice,
        status: mpData.status || 'pending',
        qr_code: pixInfo?.qr_code || null,
        qr_code_base64: pixInfo?.qr_code_base64 || null,
        copy_paste: pixInfo?.qr_code || null,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    console.log(`Payment created: ${payment.id} for ${quantity} credits, total R$${totalPrice}`);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        external_id: String(mpData.id),
        status: mpData.status,
        qr_code: pixInfo?.qr_code || null,
        qr_code_base64: pixInfo?.qr_code_base64 || null,
        copy_paste: pixInfo?.qr_code || null,
        total_price: totalPrice,
        amount_credits: quantity,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in mp-create-payment:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
