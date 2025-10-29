// @ts-ignore
/// <reference lib="deno.ns" />
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

  let scheduledNotificationId: string | null = null;
  let userId: string | null = null;
  let clientId: string | null = null;
  let templateId: string | null = null;
  let n8nWebhookUrl: string | null = null;
  let statusCode: number | null = null;
  let errorMessage: string = 'An unknown error occurred.';
  let requestBody: any = {};
  let responseBody: any = null;
  let clientNameForLog: string = 'Unknown Client';
  let instanceName: string | null = null; // Variável para armazenar o instanceName

  try {
    const currentTimeStart = new Date().toISOString();
    console.log(`send-scheduled-notification: Function started at ${currentTimeStart}`);
    const { id } = await req.json();
    scheduledNotificationId = id;
    console.log(`send-scheduled-notification: Received request for scheduledNotificationId: ${scheduledNotificationId}`);

    if (!scheduledNotificationId) {
      errorMessage = 'Scheduled notification ID is required.';
      console.error(`send-scheduled-notification: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Fetch scheduled notification details
    // Service role bypasses RLS, so no explicit user_id filter needed here.
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('scheduled_notifications')
      .select(`
        user_id,
        client_id,
        template_id,
        clients(name, phone, value, next_billing_date, plans(name)),
        templates(name, content)
      `)
      .eq('id', scheduledNotificationId)
      .single();

    if (notificationError || !notification) {
      errorMessage = `Failed to fetch scheduled notification: ${notificationError?.message || 'Not found'}`;
      console.error(`send-scheduled-notification: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    userId = notification.user_id;
    clientId = notification.client_id;
    templateId = notification.template_id;
    const client = Array.isArray(notification.clients) ? notification.clients[0] : notification.clients;
    const template = Array.isArray(notification.templates) ? notification.templates[0] : notification.templates;

    if (!client) {
      errorMessage = 'Client not found for scheduled notification.';
      console.error(`send-scheduled-notification: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    if (!template) {
      errorMessage = 'Template not found for scheduled notification.';
      console.error(`send-scheduled-notification: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    clientNameForLog = client.name;
    const scheduledFor = notification.send_at || 'unknown';
    const delayFromScheduled = new Date().getTime() - new Date(scheduledFor).getTime();
    const delayMinutes = Math.round(delayFromScheduled / 60000);
    console.log(`send-scheduled-notification: Processing notification ID ${scheduledNotificationId}`);
    console.log(`  → Client: ${clientNameForLog}`);
    console.log(`  → Template: ${template.name}`);
    console.log(`  → Scheduled for: ${scheduledFor} UTC`);
    console.log(`  → Delay: ${delayMinutes} minutes`);

    // --- NOVO: Buscar o instanceName do usuário ---
    // Service role bypasses RLS, so no explicit user_id filter needed here.
    const { data: userInstance, error: instanceError } = await supabaseAdmin
      .from('user_instances')
      .select('instance_name')
      .eq('user_id', userId)
      .single();

    if (instanceError || !userInstance?.instance_name) {
      errorMessage = `User ${userId} does not have an active instance configured. Skipping notification.`;
      console.error(`send-scheduled-notification: ${errorMessage}`);
      // Não lançar erro aqui, mas atualizar o status da notificação para 'failed' e logar.
      // O bloco finally cuidará do log e da atualização de status.
      statusCode = 412; // Precondition Failed, ou um código customizado para "instância não configurada"
      throw new Error(errorMessage); // Lança para ir para o bloco finally
    }
    instanceName = userInstance.instance_name;
    console.log(`send-scheduled-notification: Instance Name for user ${userId}: ${instanceName}`);

    // Fetch n8n webhook URL (global config, no user_id filter needed)
    const { data: webhookConfig, error: webhookError } = await supabaseAdmin
      .from('webhook_configs')
      .select('url')
      .eq('type', 'n8n_message_sender')
      .maybeSingle();

    if (webhookError || !webhookConfig?.url) {
      errorMessage = `N8N message sender webhook URL not configured. Configure in Webhooks page.`;
      console.error(`send-scheduled-notification: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    n8nWebhookUrl = webhookConfig.url;
    console.log(`send-scheduled-notification: N8N Webhook URL: ${n8nWebhookUrl}`);

    // --- NOVO: Buscar a chave PIX do perfil do usuário ---
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('pix_key')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error(`send-scheduled-notification: Error fetching user profile for pix_key: ${profileError.message}`);
    }
    const pixKey = userProfile?.pix_key || 'Chave PIX não cadastrada';
    console.log(`send-scheduled-notification: User PIX Key: ${pixKey}`);

    // Variable substitution
    let renderedText = template.content;
    renderedText = renderedText.replaceAll('{{customer_name}}', client.name);
    
    // ✅ POLÍTICA UTC: next_billing_date já está no formato YYYY-MM-DD (data local sem timezone)
    // Não precisa converter timezone, apenas formatar para pt-BR
    const dueDate = new Date(client.next_billing_date + 'T00:00:00');
    const formattedDate = dueDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    renderedText = renderedText.replaceAll('{{due_date}}', formattedDate);
    
    const planData = Array.isArray(client.plans) ? client.plans[0] : client.plans;
    renderedText = renderedText.replaceAll('{{plan_name}}', planData?.name || 'Plano Desconhecido');
    renderedText = renderedText.replaceAll('{{value}}', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.value));
    renderedText = renderedText.replaceAll('{{pix_key}}', pixKey); // --- NOVO: Substituição da chave PIX ---
    console.log(`send-scheduled-notification: Rendered message: ${renderedText}`);

    requestBody = {
      body: [
        {
          instanceName: instanceName, // --- NOVO: Adicionado o instanceName aqui ---
          contact_name: client.name,
          number: client.phone, // Assumindo que o formato já é adequado para WhatsApp
          text: renderedText,
          mode: "real"
        }
      ]
    };
    console.log(`send-scheduled-notification: Sending payload to n8n: ${JSON.stringify(requestBody)}`);

    // Send message via n8n webhook
    if (!n8nWebhookUrl) {
      errorMessage = 'N8N webhook URL is null or undefined before fetch.';
      console.error(`send-scheduled-notification: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    statusCode = response.status;
    console.log(`send-scheduled-notification: N8N Webhook response status: ${statusCode}`);

    // Tenta ler o corpo da resposta, seja sucesso ou erro
    try {
      responseBody = await response.json();
    } catch (jsonError) {
      // Se não for JSON, tenta ler como texto
      responseBody = await response.text();
      console.warn(`send-scheduled-notification: N8N response was not JSON, read as text. Error: ${jsonError}`);
    }
    console.log(`send-scheduled-notification: N8N Webhook response body: ${JSON.stringify(responseBody)}`);


    if (!response.ok) {
      errorMessage = String(responseBody?.message || response.statusText || `Automation server returned an error with status ${statusCode}.`);
      console.error(`send-scheduled-notification: N8N Webhook error response: ${JSON.stringify(responseBody)}`);
      throw new Error(errorMessage);
    }

    // Update scheduled notification status to 'sent'
    const { error: updateSentError } = await supabaseAdmin
      .from('scheduled_notifications')
      .update({ status: 'sent' })
      .eq('id', scheduledNotificationId);
    
    if (updateSentError) {
      console.error(`send-scheduled-notification: Error updating status to 'sent': ${updateSentError.message}`);
    } else {
      console.log(`send-scheduled-notification: ✅ Notification ${scheduledNotificationId} marked as 'sent' successfully`);
    }

    // Log to n8n_message_sender_history (NOVA TABELA)
    const { error: historyInsertError } = await supabaseAdmin
      .from('n8n_message_sender_history') // Alterado para a nova tabela
      .insert({
        user_id: userId,
        client_id: clientId,
        template_id: templateId,
        webhook_type: 'n8n_message_outbound_automated',
        payload: requestBody,
        request_payload: requestBody,
        response_payload: responseBody,
        status_code: statusCode,
        client_name_snapshot: clientNameForLog, // Save client name snapshot
      });
    
    if (historyInsertError) {
      console.error(`send-scheduled-notification: Error logging to n8n_message_sender_history: ${historyInsertError.message}`);
    } else {
      console.log(`send-scheduled-notification: ✅ Logged to n8n_message_sender_history for ${scheduledNotificationId}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Notification sent successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(`send-scheduled-notification: Error processing notification ${scheduledNotificationId} for client ${clientNameForLog}: ${error.message}`);
    errorMessage = String(error.message);

    // Update scheduled notification status to 'failed'
    if (scheduledNotificationId) {
      await supabaseAdmin
        .from('scheduled_notifications')
        .update({ status: 'failed' })
        .eq('id', scheduledNotificationId);
      console.log(`send-scheduled-notification: Scheduled notification ${scheduledNotificationId} status updated to 'failed'.`);
    }

    // Log error to n8n_message_sender_history (NOVA TABELA)
    if (userId) {
      await supabaseAdmin
        .from('n8n_message_sender_history') // Alterado para a nova tabela
        .insert({
          user_id: userId,
          client_id: clientId,
          template_id: templateId,
          webhook_type: 'n8n_message_outbound_automated',
          payload: requestBody,
          request_payload: requestBody,
          response_payload: responseBody,
          status_code: statusCode || 500,
          client_name_snapshot: clientNameForLog, // Save client name snapshot even on error
        });
      console.log(`send-scheduled-notification: Logged error to n8n_message_sender_history for ${scheduledNotificationId}.`);
    }

    return new Response(JSON.stringify({ error: errorMessage || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});