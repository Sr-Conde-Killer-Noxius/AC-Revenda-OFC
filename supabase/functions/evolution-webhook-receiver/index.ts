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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Received Evolution API webhook:', JSON.stringify(payload, null, 2));

    // Normalizar payload (pode ser array ou objeto)
    const webhookData = Array.isArray(payload) ? payload[0] : payload;
    
    // Extrair dados do webhook (compatível com múltiplos formatos)
    const instanceName = webhookData?.instance?.instanceName
      ?? webhookData?.instance
      ?? webhookData?.data?.instance
      ?? webhookData?.data?.instanceName;

    const state = webhookData?.instance?.state
      ?? webhookData?.data?.state
      ?? webhookData?.state;

    const event = webhookData?.event ?? webhookData?.type ?? 'connection.update';

    if (!instanceName) {
      console.error('Missing instanceName in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing instanceName' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Logar no histórico
    const { error: historyError } = await supabase
      .from('evolution_api_history')
      .insert({
        instance_name: instanceName,
        event_type: event,
        status_code: 200,
        payload: payload
      });

    if (historyError) {
      console.error('Error logging to history:', historyError);
    } else {
      console.log(`Logged to history for instance: ${instanceName}`);
    }

    // Determinar status da conexão baseado no state
    let connectionStatus = 'disconnected';
    let qrCodeBase64 = null;
    let lastConnectedAt = null;

    if (state === 'connecting') {
      connectionStatus = 'connecting';
    } else if (state === 'open') {
      connectionStatus = 'connected';
      lastConnectedAt = new Date().toISOString();
    } else if (state === 'close') {
      connectionStatus = 'disconnected';
    }

    console.log(`Updating instance ${instanceName} to status: ${connectionStatus}`);

    // Atualizar user_instances
    const { error: updateError } = await supabase
      .from('user_instances')
      .update({
        connection_status: connectionStatus,
        qr_code_base64: qrCodeBase64,
        last_connected_at: lastConnectedAt,
      })
      .eq('instance_name', instanceName);

    if (updateError) {
      console.error('Error updating user_instances:', updateError);
      throw updateError;
    }

    console.log(`Successfully updated instance ${instanceName}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
