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
    console.log('pagbank-create-charge: Function started.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('pagbank-create-charge: Unauthorized - Missing Authorization header.');
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
      console.error('pagbank-create-charge: User authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;
    console.log('pagbank-create-charge: User authenticated, userId:', userId);

    const { subscription_id, amount } = await req.json();
    console.log(`pagbank-create-charge: Received payload: subscription_id=${subscription_id}, amount=${amount}`);

    if (!subscription_id || !amount) {
      console.error('pagbank-create-charge: Missing subscription_id or amount in payload.');
      return new Response(JSON.stringify({ error: 'Missing subscription_id or amount.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch PagBank credentials and environment
    console.log('pagbank-create-charge: Fetching PagBank configs...');
    const { data: pagbankConfig, error: configError } = await supabaseAdmin
      .from('pagbank_configs')
      .select('pagbank_email, pagbank_token, pagbank_pix_key, environment') // NOVO: Incluir 'environment'
      .eq('id', 1)
      .single();

    if (configError || !pagbankConfig) {
      console.error('pagbank-create-charge: PagBank config not found:', configError?.message);
      return new Response(JSON.stringify({ error: 'PagBank configuration not found. Please contact support.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('pagbank-create-charge: PagBank config fetched successfully. Environment:', pagbankConfig.environment); // NOVO: Log do ambiente

    // NOVO: Definir a URL base da API PagBank com base no ambiente
    const baseUrl = pagbankConfig.environment === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';
    const pagbankApiUrl = `${baseUrl}/orders`; // Usar a baseUrl dinâmica
    console.log('pagbank-create-charge: Using PagBank API URL:', pagbankApiUrl);


    // 2. Fetch subscription details to get plan_name for description
    console.log('pagbank-create-charge: Fetching subscription details...');
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_name')
      .eq('id', subscription_id)
      .single();

    if (subscriptionError || !subscription) {
      console.error('pagbank-create-charge: Subscription not found:', subscriptionError?.message);
      return new Response(JSON.stringify({ error: 'Subscription not found for the provided ID.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('pagbank-create-charge: Subscription details fetched successfully. Plan Name:', subscription.plan_name);

    // 2.1. Fetch customer data from profiles (including phone and new tax_id)
    console.log('pagbank-create-charge: Fetching customer profile...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('name, email, phone, tax_id') // Incluído o novo campo tax_id
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('pagbank-create-charge: Customer profile not found for userId:', userId, profileError?.message);
      return new Response(JSON.stringify({ error: 'Perfil do usuário não encontrado.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('pagbank-create-charge: Customer profile fetched successfully. Name:', profile.name);

    // Validação e limpeza do tax_id do perfil
    const cleanedTaxId = profile.tax_id?.replace(/\D/g, '');
    if (!cleanedTaxId || (cleanedTaxId.length !== 11 && cleanedTaxId.length !== 14)) {
      console.error('pagbank-create-charge: Invalid or missing CPF/CNPJ in user profile:', profile.tax_id);
      return new Response(JSON.stringify({ error: 'CPF/CNPJ inválido ou ausente no perfil do usuário. Por favor, atualize seu perfil.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build CORRECT PagBank API Payload (based on Pedido.pdf)
    const amountInCents = Math.round(amount * 100); // PagBank expects amount in cents

    const pagbankRequestBody: any = {
      reference_id: `sub-${subscription_id}-${Date.now()}`, // Unique reference for tracking
      customer: {
        name: profile.name,
        email: profile.email,
        tax_id: cleanedTaxId, // Usando o tax_id limpo e validado do perfil
      },
      items: [
        {
          name: `Assinatura ${subscription.plan_name}`,
          quantity: 1,
          unit_amount: amountInCents,
        },
      ],
      qr_codes: [
        {
          amount: {
            value: amountInCents,
          },
          expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiration
        },
      ],
      notification_urls: [
        // @ts-ignore
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/pagbank-webhook-receiver` // CORRIGIDO: Usando SUPABASE_URL
      ],
    };

    // Populate customer phones conditionally
    const cleanedPhone = profile.phone?.replace(/\D/g, '');
    if (cleanedPhone && cleanedPhone.length >= 10 && cleanedPhone.startsWith('55')) { // Basic validation for BR phone
      const areaCode = cleanedPhone.substring(2, 4); // Assuming 55DD
      const phoneNumber = cleanedPhone.substring(4); // Rest of the number
      pagbankRequestBody.customer.phones = [
        {
          country: "55",
          area: areaCode,
          number: phoneNumber,
          type: "MOBILE" // Assuming mobile phone
        }
      ];
    }

    console.log('pagbank-create-charge: Sending request to PagBank API with body:', JSON.stringify(pagbankRequestBody, null, 2));

    const pagbankResponse = await fetch(pagbankApiUrl, { // Usar pagbankApiUrl dinâmica
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pagbankConfig.pagbank_token}`,
        'x-api-version': '2024-03-01' // As suggested, or check latest PagBank docs
      },
      body: JSON.stringify(pagbankRequestBody),
    });

    const pagbankResponseData = await pagbankResponse.json();
    console.log('pagbank-create-charge: PagBank API raw response:', JSON.stringify(pagbankResponseData, null, 2));

    if (!pagbankResponse.ok) {
      console.error('pagbank-create-charge: PagBank API error response:', pagbankResponseData);
      const errorMessage = pagbankResponseData.message || pagbankResponseData.error_messages?.[0]?.description || `Falha ao criar cobrança PIX no PagBank: ${pagbankResponse.statusText}`;
      throw new Error(errorMessage);
    }

    // 4. Extract data from PagBank response (for /orders endpoint)
    const pagbankChargeId = pagbankResponseData.id;
    // CORRIGIDO: Extração da URL da imagem do QR Code
    const qrCodeImageUrl = pagbankResponseData.qr_codes?.[0]?.links?.find((link: any) => link.rel === 'QRCODE.PNG')?.href;
    const qrCodeText = pagbankResponseData.qr_codes?.[0]?.text;

    if (!pagbankChargeId || !qrCodeImageUrl || !qrCodeText) {
      console.error('pagbank-create-charge: Missing required data in PagBank response:', pagbankResponseData);
      throw new Error('Dados essenciais (ID da cobrança, QR Code) não encontrados na resposta do PagBank.');
    }
    console.log('pagbank-create-charge: PagBank response parsed successfully. Charge ID:', pagbankChargeId);

    // 5. Save charge details to pagbank_charges
    console.log('pagbank-create-charge: Inserting charge into pagbank_charges...');
    const { data: newCharge, error: insertError } = await supabaseAdmin
      .from('pagbank_charges')
      .insert({
        user_id: userId,
        subscription_id: subscription_id,
        pagbank_charge_id: pagbankChargeId,
        status: 'PENDING',
        value: amount,
      })
      .select()
      .single();

    if (insertError) {
      console.error('pagbank-create-charge: Error inserting PagBank charge:', insertError.message);
      throw new Error(`Failed to record PagBank charge: ${insertError.message}`);
    }
    console.log('pagbank-create-charge: Charge inserted successfully, newChargeId:', newCharge.id);

    const responsePayload = {
      pagbank_charge_id: newCharge.pagbank_charge_id,
      qr_code_image_url: qrCodeImageUrl,
      qr_code_text: qrCodeText,
      value: amount,
    };
    console.log('pagbank-create-charge: Returning response:', JSON.stringify(responsePayload));

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('pagbank-create-charge: Unhandled error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});