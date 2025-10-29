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

  let payload: any;
  let instanceName: string | null = null;
  let userId: string | null = null;
  let eventType: string | null = null;
  let historyEntryId: string | null = null; // Para armazenar o ID da entrada inicial do histórico

  try {
    payload = await req.json();
    console.log('Evolution Webhook received:', JSON.stringify(payload, null, 2));

    instanceName = payload.instance;
    eventType = payload.event;

    // Se o nome da instância não for encontrado, loga e retorna erro 400
    if (!instanceName) {
      console.error('Evolution Webhook: Instance name not found in payload.');
      // Tenta logar o erro mesmo sem userId, se possível
      await supabaseAdmin.from('evolution_api_history').insert({
        user_id: null, // userId ainda não disponível
        webhook_type: eventType || 'evolution_inbound_unknown',
        payload: payload,
        request_payload: payload,
        response_payload: { error: 'Instance name not found in payload.' },
        status_code: 400,
      });
      return new Response(
        JSON.stringify({ error: 'Instance name not found in payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar o user_id associado a esta instância
    // Service role bypasses RLS, so no explicit user_id filter needed here.
    const { data: instanceData, error: instanceError } = await supabaseAdmin
      .from('user_instances')
      .select('user_id')
      .eq('instance_name', instanceName)
      .single();

    if (instanceError || !instanceData) {
      console.error('Evolution Webhook: Instance not found or error fetching user_id:', instanceError?.message);
      // Tenta logar o erro mesmo sem userId, se possível
      await supabaseAdmin.from('evolution_api_history').insert({
        user_id: null, // userId ainda não disponível
        webhook_type: eventType || 'evolution_inbound_unknown',
        payload: payload,
        request_payload: payload,
        response_payload: { error: 'Instance not found or associated user_id could not be retrieved.' },
        status_code: 404,
      });
      return new Response(
        JSON.stringify({ error: 'Instance not found or associated user_id could not be retrieved.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = instanceData.user_id;

    // Log inicial da requisição recebida
    const { data: initialHistoryEntry, error: initialLogError } = await supabaseAdmin
      .from('evolution_api_history')
      .insert({
        user_id: userId,
        webhook_type: eventType || 'evolution_inbound_unknown',
        payload: payload, // Armazena o payload completo
        request_payload: payload,
        status_code: 200, // Assume sucesso no recebimento da requisição
        response_payload: { message: 'Processing...' }, // Placeholder
      })
      .select('id')
      .single();

    if (initialLogError) {
      console.error('Evolution Webhook: Error logging initial history entry:', initialLogError.message);
    } else {
      historyEntryId = initialHistoryEntry?.id;
    }

    let finalStatus = 200;
    let finalMessage = `Evolution webhook processed. Event: ${eventType}, Instance: ${instanceName}.`;

    // Lógica Condicional para Atualização de Status
    if (eventType === 'connection.update' && payload.data?.state === 'open') {
      console.log(`Evolution Webhook: Connection update event with state 'open' detected for instance ${instanceName}.`);

      // Service role bypasses RLS, but we still filter by user_id to ensure data integrity.
      const { error: updateError } = await supabaseAdmin
        .from('user_instances')
        .update({ status: 'connected', qr_code_base64: null })
        .eq('instance_name', instanceName)
        .eq('user_id', userId); // Filter by user_id

      if (updateError) {
        console.error('Evolution Webhook: Error updating user_instances to connected:', updateError);
        finalStatus = 500; // Erro interno do servidor para falha na atualização do DB
        finalMessage += ` (Internal update error: ${updateError.message})`;
      } else {
        console.log(`Evolution Webhook: user_instances for ${instanceName} updated to 'connected'.`);
      }

      // Service role bypasses RLS, but we still filter by user_id to ensure data integrity.
      const { error: statusError } = await supabaseAdmin
        .from('connection_status')
        .upsert({
          user_id: userId,
          instance_name: instanceName,
          status: 'connected',
          qr_code_base64: null,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'user_id,instance_name'
        });

      if (statusError) {
        console.error('Evolution Webhook: Error updating connection_status to connected:', statusError);
        finalStatus = 500; // Erro interno do servidor para falha na atualização do DB
        finalMessage += ` (Internal connection_status update error: ${statusError.message})`;
      } else {
        console.log(`Evolution Webhook: connection_status for ${instanceName} updated to 'connected'.`);
      }
    } else if (eventType === 'connection.update' && payload.data?.state === 'close') { // NOVO: Lógica para 'close'
      console.log(`Evolution Webhook: Connection update event with state 'close' detected for instance ${instanceName}.`);

      // Service role bypasses RLS, but we still filter by user_id to ensure data integrity.
      const { error: updateError } = await supabaseAdmin
        .from('user_instances')
        .update({ status: 'disconnected', qr_code_base64: null })
        .eq('instance_name', instanceName)
        .eq('user_id', userId); // Filter by user_id

      if (updateError) {
        console.error('Evolution Webhook: Error updating user_instances to disconnected:', updateError);
        finalStatus = 500;
        finalMessage += ` (Internal update error: ${updateError.message})`;
      } else {
        console.log(`Evolution Webhook: user_instances for ${instanceName} updated to 'disconnected'.`);
      }

      // Service role bypasses RLS, but we still filter by user_id to ensure data integrity.
      const { error: statusError } = await supabaseAdmin
        .from('connection_status')
        .upsert({
          user_id: userId,
          instance_name: instanceName,
          status: 'disconnected',
          qr_code_base64: null,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'user_id,instance_name'
        });

      if (statusError) {
        console.error('Evolution Webhook: Error updating connection_status to disconnected:', statusError);
        finalStatus = 500;
        finalMessage += ` (Internal connection_status update error: ${statusError.message})`;
      } else {
        console.log(`Evolution Webhook: connection_status for ${instanceName} updated to 'disconnected'.`);
      }
    } else {
      finalMessage += ` No status change applied.`;
    }

    // Atualiza a entrada do histórico com o status e mensagem finais
    if (historyEntryId) {
      await supabaseAdmin
        .from('evolution_api_history')
        .update({ status_code: finalStatus, response_payload: { message: finalMessage } })
        .eq('id', historyEntryId);
    }

    return new Response(
      JSON.stringify({ success: finalStatus === 200, message: finalMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: finalStatus }
    );

  } catch (error: any) {
    console.error('Evolution Webhook: Unhandled error:', error.message);
    const errorStatus = 500;
    const errorMessage = error.message || 'Unknown error in Evolution Webhook.';

    // Se uma entrada inicial do histórico foi criada, atualiza. Caso contrário, cria uma nova.
    if (historyEntryId && userId) {
      await supabaseAdmin
        .from('evolution_api_history')
        .update({ status_code: errorStatus, response_payload: { error: errorMessage } })
        .eq('id', historyEntryId);
    } else if (userId && payload && eventType) {
      await supabaseAdmin
        .from('evolution_api_history')
        .insert({
          user_id: userId,
          webhook_type: eventType || 'evolution_inbound_unknown',
          payload: payload,
          request_payload: payload,
          response_payload: { error: errorMessage },
          status_code: errorStatus,
        });
    } else {
      console.error('Evolution Webhook: Could not log error to evolution_api_history, missing userId, payload or eventType.');
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: errorStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});