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
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { requestPayload, responsePayload, statusCode, errorMessage, instanceName } = await req.json();

    // Service role bypasses RLS, so no explicit user_id filter needed here.
    const { error: insertError } = await supabaseAdmin
      .from('n8n_qr_code_history')
      .insert({
        user_id: user.id,
        webhook_type: 'n8n_outbound_qr',
        payload: { instanceName, requestPayload, responsePayload, errorMessage }, // Consolidar payload
        request_payload: requestPayload,
        response_payload: responsePayload,
        status_code: statusCode,
      });

    if (insertError) {
      console.error('log-n8n-qr-interaction: Error inserting into n8n_qr_code_history:', insertError.message);
      throw new Error(`Failed to log QR interaction: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'QR interaction logged successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('log-n8n-qr-interaction: Unhandled error:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});