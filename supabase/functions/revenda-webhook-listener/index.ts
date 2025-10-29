// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('Revenda Webhook Listener: Function execution started.');
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
  let eventType: string | null = null;
  let historyEntryId: string | null = null;
  let finalStatus = 200;
  let finalMessage = 'Webhook processed successfully.';

  try {
    payload = await req.json();
    eventType = payload.eventType;

    console.log('Revenda Webhook: Received payload:', JSON.stringify(payload));
    console.log('Revenda Webhook: Extracted eventType:', eventType);

    if (!eventType) {
      finalStatus = 400;
      finalMessage = 'Missing eventType in payload.';
      console.error('Revenda Webhook: ' + finalMessage);
      const { error: initialLogError } = await supabaseAdmin
        .from('revenda_webhook_history')
        .insert({
          event_type: 'unknown',
          payload: payload,
          status_code: finalStatus,
          processing_log: finalMessage,
        });
      if (initialLogError) console.error('Revenda Webhook: Error logging initial error:', initialLogError.message);
      return new Response(
        JSON.stringify({ error: finalMessage }),
        { status: finalStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: initialHistoryEntry, error: initialLogError } = await supabaseAdmin
      .from('revenda_webhook_history')
      .insert({
        event_type: eventType,
        payload: payload,
        status_code: 200,
        processing_log: 'Received and processing...',
      })
      .select('id')
      .single();

    if (initialLogError) {
      console.error('Revenda Webhook: Error logging initial history entry:', initialLogError.message);
    } else {
      historyEntryId = initialHistoryEntry?.id;
    }

    if (eventType === 'create_user') {
      const { email, password: rawPassword, name, fullName, phone: rawPhone, tax_id: rawTaxId, externalId: payloadExternalId, userId: payloadUserId } = payload;

      const userName = name || fullName;
      const phone = typeof rawPhone === 'string' ? rawPhone : null;
      const tax_id = typeof rawTaxId === 'string' ? rawTaxId : null;
      const externalId = payloadExternalId || payloadUserId; // Prioriza externalId, fallback para userId
      const password = typeof rawPassword === 'string' ? rawPassword.trim() : rawPassword; // Limpa a senha

      console.log('Revenda Webhook: create_user event - email:', email, 'password:', password ? '***' : 'N/A', 'userName:', userName, 'externalId:', externalId);

      if (!email || !password || !userName || !externalId) { // externalId agora é obrigatório para criação via revenda
        finalStatus = 400;
        finalMessage = 'Missing required fields for user creation (email, password, name, externalId).';
        console.error('Revenda Webhook: ' + finalMessage);
      } else {
        const { error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: String(userName),
            phone: phone,
            tax_id: tax_id,
            revenda_source: true,
            external_id: externalId, // NOVO: Passa o externalId para os metadados
          },
        });

        if (authError) {
          finalStatus = 500;
          finalMessage = `Failed to create user in auth: ${authError.message}`;
          console.error('Revenda Webhook: ' + finalMessage);
        } else {
          finalMessage = `User ${email} created successfully with external ID ${externalId}.`;
          console.log('Revenda Webhook: ' + finalMessage);
        }
      }
    } else if (eventType === 'delete_user' || eventType === 'update_user_status') {
      const { userId: externalUserId, newStatus } = payload; // userId do payload é agora o externalId

      if (!externalUserId) {
        finalStatus = 400;
        finalMessage = `Missing externalUserId for ${eventType} event.`;
        console.error('Revenda Webhook: ' + finalMessage);
      } else {
        // Buscar o ID interno do usuário (auth.users.id / profiles.id) usando o external_id
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('external_id', externalUserId)
          .single();

        if (profileError || !profileData) {
          finalStatus = 404;
          finalMessage = `User with external ID ${externalUserId} not found in Acerto Certo profiles.`;
          console.warn('Revenda Webhook: ' + finalMessage);
        } else {
          const internalUserId = profileData.id; // Este é o UUID interno do Supabase

          if (eventType === 'delete_user') {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(internalUserId);

            if (deleteError) {
              finalStatus = 500;
              finalMessage = `Failed to delete user with internal ID ${internalUserId} (external ID: ${externalUserId}): ${deleteError.message}`;
              console.error('Revenda Webhook: ' + finalMessage);
            } else {
              finalMessage = `User with internal ID ${internalUserId} (external ID: ${externalUserId}) deleted successfully.`;
              console.log('Revenda Webhook: ' + finalMessage);
            }
          } else if (eventType === 'update_user_status') {
            // Lógica para determinar o status da assinatura com base no newStatus da revenda
            let targetSubscriptionStatus: 'active' | 'inactive' | 'overdue' | null = null;
            let currentProcessingLogMessage = '';

            if (newStatus === 'inactive' || newStatus === 'suspended') {
                targetSubscriptionStatus = 'overdue';
                currentProcessingLogMessage = `Status da assinatura atualizado para 'overdue' via webhook.`;
                console.log(`Revenda Webhook: Setting target subscription status to 'overdue' for user ${internalUserId}`);
            } else if (newStatus === 'active') {
                targetSubscriptionStatus = 'active';
                currentProcessingLogMessage = `Status da assinatura atualizado para 'active' via webhook.`;
                console.log(`Revenda Webhook: Setting target subscription status to 'active' for user ${internalUserId}`);
            } else {
                currentProcessingLogMessage = `Erro: Status '${newStatus}' recebido do webhook não suportado. Status da assinatura não alterado.`;
                console.warn(`Revenda Webhook: Received unsupported status '${newStatus}' for user ${internalUserId}. No subscription status change.`);
                finalStatus = 400; // Define o status final como 400 para status não suportado
            }

            // Tenta atualizar o status da assinatura se um targetSubscriptionStatus válido foi determinado
            if (targetSubscriptionStatus && finalStatus !== 400) {
                console.log(`Revenda Webhook: Attempting to update subscription status to '${targetSubscriptionStatus}' for user ${internalUserId}`);
                const { error: updateSubscriptionError } = await supabaseAdmin
                  .from('subscriptions') // Atualizando a tabela 'subscriptions'
                  .update({ status: targetSubscriptionStatus })
                  .eq('user_id', internalUserId);

                if (updateSubscriptionError) {
                    console.error(`Revenda Webhook: Error updating subscription status for user ${internalUserId}:`, updateSubscriptionError);
                    currentProcessingLogMessage = `Erro ao atualizar status da assinatura para ${targetSubscriptionStatus}: ${updateSubscriptionError.message}`;
                    finalStatus = 500; // Erro interno do servidor para falha na atualização do DB
                } else {
                    console.log(`Revenda Webhook: Successfully updated subscription status to '${targetSubscriptionStatus}' for user ${internalUserId}`);
                    finalStatus = 200; // Sucesso
                }
            } else if (!targetSubscriptionStatus && finalStatus !== 400) {
                // Este bloco é um fallback para erros de lógica interna, caso targetSubscriptionStatus seja null
                // mas newStatus era válido e internalUserId foi encontrado.
                currentProcessingLogMessage = `Erro interno: targetSubscriptionStatus não definido para um status válido.`;
                console.error(`Revenda Webhook: ${currentProcessingLogMessage}`);
                finalStatus = 500;
            }
            finalMessage = currentProcessingLogMessage; // Atualiza a mensagem final com o log específico deste evento
          }
        }
      }
    } else {
      finalStatus = 400;
      finalMessage = `Unknown eventType: ${eventType}`;
      console.warn('Revenda Webhook: ' + finalMessage);
    }

    // Atualiza a entrada do histórico com o status e mensagem finais
    if (historyEntryId) {
      await supabaseAdmin
        .from('revenda_webhook_history')
        .update({ status_code: finalStatus, processing_log: finalMessage })
        .eq('id', historyEntryId);
    }

    return new Response(
      JSON.stringify({ success: finalStatus === 200, message: finalMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: finalStatus }
    );

  } catch (error: any) {
    console.error('Revenda Webhook: Unhandled error:', error.message);
    finalStatus = 500;
    finalMessage = error.message || 'An unknown error occurred.';

    if (historyEntryId) {
      await supabaseAdmin
        .from('revenda_webhook_history')
        .update({ status_code: finalStatus, processing_log: finalMessage })
        .eq('id', historyEntryId);
    } else if (payload && eventType) {
      await supabaseAdmin
        .from('revenda_webhook_history')
        .insert({
          event_type: eventType,
          payload: payload,
          status_code: finalStatus,
          processing_log: finalMessage,
        });
    } else {
      console.error('Revenda Webhook: Could not log error to revenda_webhook_history, missing payload or eventType.');
    }

    return new Response(
      JSON.stringify({ error: finalMessage }),
      { status: finalStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});