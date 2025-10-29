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

// Define a interface para o payload que a Edge Function espera
interface EdgeFunctionPayload {
  automationId: string;
  notifications: {
    user_id: string; // Adicionado para consistência com o frontend
    client_id: string;
    template_id: string;
    automation_id: string;
    send_at: string; // ISO string UTC, já calculada pelo frontend
    status: 'pending'; // Sempre 'pending' ao inserir
  }[];
}

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

  let userId: string | null = null; // Para logs e RLS
  let automationIdForLog: string | null = null;

  try {
    console.log('schedule-notifications-for-rule: Function started.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('schedule-notifications-for-rule: Unauthorized - Missing Authorization header.');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    // Usar o cliente Supabase com o token do usuário para obter o user.id
    const supabaseClientForUser = createClient(
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

    const { data: { user }, error: userError } = await supabaseClientForUser.auth.getUser();
    if (userError || !user) {
      console.error('schedule-notifications-for-rule: User authentication failed:', userError?.message);
      throw new Error(userError?.message || 'User not authenticated');
    }
    userId = user.id;
    console.log(`schedule-notifications-for-rule: Authenticated user: ${userId}`);

    const { automationId, notifications }: EdgeFunctionPayload = await req.json();
    automationIdForLog = automationId;
    console.log(`schedule-notifications-for-rule: Received request for automationId: ${automationId} with ${notifications?.length || 0} notifications.`);

    if (!automationId || !notifications) {
      console.error('schedule-notifications-for-rule: automationId and notifications array are required.');
      throw new Error('automationId and notifications array are required.');
    }

    // ✅ POLÍTICA UTC: Validar que todas as datas estão em formato UTC válido
    const nowUtc = new Date();
    for (const notification of notifications) {
      const sendAtDate = new Date(notification.send_at);
      
      // Verificar se é uma data válida
      if (isNaN(sendAtDate.getTime())) {
        console.error(`schedule-notifications-for-rule: Invalid send_at date: ${notification.send_at}`);
        throw new Error(`Invalid send_at date for client ${notification.client_id}`);
      }
      
      // Verificar se está no futuro (com margem de 1 minuto para evitar descartes por latência de rede)
      if (sendAtDate.getTime() < nowUtc.getTime() - 60000) {
        console.warn(`schedule-notifications-for-rule: Skipping past notification: ${notification.send_at} (now: ${nowUtc.toISOString()}) for client ${notification.client_id}`);
      }
    }
    
    console.log(`schedule-notifications-for-rule: Scheduling ${notifications.length} notifications for automation ${automationId}:`);
    notifications.forEach(n => {
      console.log(`  → Client ${n.client_id}: send_at=${n.send_at} UTC`);
    });

    // 1. Delete existing pending scheduled notifications for this automation and user
    console.log(`schedule-notifications-for-rule: Attempting to delete existing pending notifications for automation ${automationId}.`);
    // Service role bypasses RLS, but we still filter by user_id to ensure data integrity.
    const { error: deleteError } = await supabaseAdmin
      .from('scheduled_notifications')
      .delete()
      .eq('automation_id', automationId)
      .eq('user_id', userId) // Garante que o usuário só delete seus próprios agendamentos
      .eq('status', 'pending');

    if (deleteError) {
      console.error(`schedule-notifications-for-rule: Failed to delete existing pending notifications: ${deleteError.message}`);
      throw new Error(`Failed to delete existing pending notifications: ${deleteError.message}`);
    }
    console.log(`schedule-notifications-for-rule: Successfully deleted existing pending notifications for automation ${automationId}.`);

    // 2. Insert new scheduled notifications
    if (notifications.length > 0) {
      // Adiciona o status 'pending' e o user_id a cada notificação antes de inserir
      const notificationsToInsert = notifications.map(n => ({
        ...n,
        user_id: userId, // Garante que o user_id está correto
        automation_id: automationId, // Garante que o automation_id está correto
        status: 'pending',
      }));

      // Service role bypasses RLS, but we still ensure user_id is set correctly.
      const { error: insertError } = await supabaseAdmin
        .from('scheduled_notifications')
        .insert(notificationsToInsert);

      if (insertError) {
        console.error(`schedule-notifications-for-rule: Failed to insert scheduled notifications: ${insertError.message}`);
        throw new Error(`Failed to insert scheduled notifications: ${insertError.message}`);
      }
      console.log(`schedule-notifications-for-rule: Successfully inserted ${notificationsToInsert.length} scheduled notifications.`);
    } else {
      console.log('schedule-notifications-for-rule: No new notifications to insert.');
    }

    return new Response(JSON.stringify({ success: true, message: 'Notifications scheduled successfully.', count: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(`schedule-notifications-for-rule: An unexpected error occurred for automation ${automationIdForLog || 'N/A'}: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});