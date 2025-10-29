// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    console.log('mercado-pago-create-charge: Function started.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('mercado-pago-create-charge: Unauthorized - Missing Authorization header.');
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
      console.error('mercado-pago-create-charge: User authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;
    console.log('mercado-pago-create-charge: User authenticated, userId:', userId);

    const { subscription_id, amount } = await req.json();
    console.log(`mercado-pago-create-charge: Received payload: subscription_id=${subscription_id}, amount=${amount}`);

    if (!subscription_id || !amount) {
      console.error('mercado-pago-create-charge: Missing subscription_id or amount in payload.');
      return new Response(JSON.stringify({ error: 'Missing subscription_id or amount.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch Mercado Pago credentials
    console.log('mercado-pago-create-charge: Fetching Mercado Pago configs...');
    const { data: mpConfig, error: configError } = await supabaseAdmin
      .from('mercado_pago_configs')
      .select('mercado_pago_access_token')
      .eq('id', 1)
      .single();

    if (configError || !mpConfig) {
      console.error('mercado-pago-create-charge: Mercado Pago config not found:', configError?.message);
      return new Response(JSON.stringify({ error: 'Mercado Pago configuration not found. Please contact support.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('mercado-pago-create-charge: Mercado Pago config fetched successfully.');

    const mercadoPagoAccessToken = mpConfig.mercado_pago_access_token;
    const mercadoPagoApiUrl = 'https://api.mercadopago.com/v1/payments'; // Mercado Pago Payments API

    // 2. Fetch subscription details to get plan_name for description
    console.log('mercado-pago-create-charge: Fetching subscription details...');
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_name')
      .eq('id', subscription_id)
      .single();

    if (subscriptionError || !subscription) {
      console.error('mercado-pago-create-charge: Subscription not found:', subscriptionError?.message);
      return new Response(JSON.stringify({ error: 'Subscription not found for the provided ID.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('mercado-pago-create-charge: Subscription details fetched successfully. Plan Name:', subscription.plan_name);

    // 2.1. Fetch customer data from profiles (including email, phone, tax_id)
    console.log('mercado-pago-create-charge: Fetching customer profile...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('name, email, phone, tax_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('mercado-pago-create-charge: Customer profile not found for userId:', userId, profileError?.message);
      return new Response(JSON.stringify({ error: 'Perfil do usuário não encontrado.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('mercado-pago-create-charge: Customer profile fetched successfully. Name:', profile.name);

    // Validação e limpeza do tax_id do perfil
    const cleanedTaxId = profile.tax_id?.replace(/\D/g, '');
    if (!cleanedTaxId || (cleanedTaxId.length !== 11 && cleanedTaxId.length !== 14)) {
      console.error('mercado-pago-create-charge: Invalid or missing CPF/CNPJ in user profile:', profile.tax_id);
      return new Response(JSON.stringify({ error: 'CPF/CNPJ inválido ou ausente no perfil do usuário. Por favor, atualize seu perfil.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build Mercado Pago API Payload for PIX payment
    const mpRequestBody: any = {
      transaction_amount: amount,
      description: `Renovação de Assinatura ${subscription.plan_name}`,
      payment_method_id: 'pix',
      payer: {
        email: profile.email,
        first_name: profile.name.split(' ')[0],
        last_name: profile.name.split(' ').slice(1).join(' ') || '',
        identification: {
          type: cleanedTaxId.length === 11 ? 'CPF' : 'CNPJ',
          number: cleanedTaxId,
        },
        // phone: { // Mercado Pago often requires phone for certain payment methods, but not strictly for PIX
        //   area_code: profile.phone?.substring(2, 4) || '',
        //   number: profile.phone?.substring(4) || '',
        // },
      },
      external_reference: `sub-${subscription_id}-${Date.now()}`, // Unique reference for tracking
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercado-pago-webhook-receiver`, // Webhook para receber atualizações
    };

    // Gerar um X-Idempotency-Key único
    const idempotencyKey = `mp-charge-${subscription_id}-${Date.now()}`;
    console.log(`mercado-pago-create-charge: Using X-Idempotency-Key: ${idempotencyKey}`);

    console.log('mercado-pago-create-charge: Sending request to Mercado Pago API with body:', JSON.stringify(mpRequestBody, null, 2));

    const mpResponse = await fetch(mercadoPagoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
        'X-Idempotency-Key': idempotencyKey, // Adicionado o cabeçalho de idempotência
      },
      body: JSON.stringify(mpRequestBody),
    });

    const mpResponseData = await mpResponse.json();
    console.log('mercado-pago-create-charge: Mercado Pago API raw response:', JSON.stringify(mpResponseData, null, 2));

    if (!mpResponse.ok) {
      console.error('mercado-pago-create-charge: Mercado Pago API error response:', mpResponseData);
      const errorMessage = mpResponseData.message || mpResponseData.error_messages?.[0]?.message || `Falha ao criar cobrança PIX no Mercado Pago: ${mpResponse.statusText}`;
      throw new Error(errorMessage);
    }

    // 4. Extract data from Mercado Pago response
    const mercadoPagoPaymentId = mpResponseData.id;
    const qrCodeImageUrl = mpResponseData.point_of_interaction?.transaction_data?.qr_code_base64 
                           ? `data:image/png;base64,${mpResponseData.point_of_interaction.transaction_data.qr_code_base64}`
                           : null;
    const qrCodeText = mpResponseData.point_of_interaction?.transaction_data?.qr_code;

    if (!mercadoPagoPaymentId || !qrCodeImageUrl || !qrCodeText) {
      console.error('mercado-pago-create-charge: Missing required data in Mercado Pago response:', mpResponseData);
      throw new Error('Dados essenciais (ID do pagamento, QR Code) não encontrados na resposta do Mercado Pago.');
    }
    console.log('mercado-pago-create-charge: Mercado Pago response parsed successfully. Payment ID:', mercadoPagoPaymentId);

    // 5. Save charge details to mercado_pago_charges
    console.log('mercado-pago-create-charge: Inserting charge into mercado_pago_charges...');
    const { data: newCharge, error: insertError } = await supabaseAdmin
      .from('mercado_pago_charges')
      .insert({
        user_id: userId,
        subscription_id: subscription_id,
        mercado_pago_payment_id: String(mercadoPagoPaymentId), // Ensure it's a string
        status: 'pending', // Initial status
        value: amount,
      })
      .select()
      .single();

    if (insertError) {
      console.error('mercado-pago-create-charge: Error inserting Mercado Pago charge:', insertError.message);
      throw new Error(`Failed to record Mercado Pago charge: ${insertError.message}`);
    }
    console.log('mercado-pago-create-charge: Charge inserted successfully, newChargeId:', newCharge.id);

    const responsePayload = {
      mercado_pago_payment_id: newCharge.mercado_pago_payment_id,
      qr_code_image_url: qrCodeImageUrl,
      qr_code_text: qrCodeText,
      value: amount,
    };
    console.log('mercado-pago-create-charge: Returning response:', JSON.stringify(responsePayload));

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('mercado-pago-create-charge: Unhandled error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});