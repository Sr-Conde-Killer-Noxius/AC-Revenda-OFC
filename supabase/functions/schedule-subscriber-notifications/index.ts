// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-ignore
import { DateTime } from 'https://esm.sh/luxon@3.4.4'; // Import Luxon for timezone handling

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define a interface para o payload que a Edge Function espera
interface EdgeFunctionPayload {
  automationId: string;
  notifications: {
    user_id: string; // ID do assinante (user_id da tabela auth.users)
    subscriber_template_id: string;
    send_at: string; // ISO string UTC
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

  let adminUserId: string | null = null; // Para logs e RLS
  let automationIdForLog: string | null = null;

  try {
    console.log('schedule-subscriber-notifications: Function started.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('schedule-subscriber-notifications: Unauthorized - Missing Authorization header.');
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
      console.error('schedule-subscriber-notifications: User authentication failed:', userError?.message);
      throw new Error(userError?.message || 'User not authenticated');
    }
    adminUserId = user.id;
    console.log(`schedule-subscriber-notifications: Authenticated admin user: ${adminUserId}`);

    // Verify admin role
    const { data: userRoleData, error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .single();

    if (userRoleError || userRoleData?.role !== 'admin') {
      console.warn('Edge Function: Unauthorized access attempt by non-admin user:', adminUserId);
      return new Response(JSON.stringify({ error: 'Access denied: Admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Edge Function: Admin user confirmed.');


    const { automationId, notifications }: EdgeFunctionPayload = await req.json();
    automationIdForLog = automationId;
    console.log(`schedule-subscriber-notifications: Received request for automationId: ${automationId} with ${notifications?.length || 0} notifications.`);

    if (!automationId || !notifications) {
      console.error('schedule-subscriber-notifications: automationId and notifications array are required.');
      throw new Error('automationId and notifications array are required.');
    }

    // Validar que todas as datas estão em formato UTC válido
    const nowUtc = DateTime.now().toUTC();
    for (const notification of notifications) {
      const sendAtDateTime = DateTime.fromISO(notification.send_at, { zone: 'utc' });
      
      if (!sendAtDateTime.isValid) {
        console.error(`schedule-subscriber-notifications: Invalid send_at date: ${notification.send_at}`);
        throw new Error(`Invalid send_at date for subscriber ${notification.user_id}`);
      }
      
      // Adicionar margem de 1 minuto para evitar descartes por latência de rede
      if (sendAtDateTime < nowUtc.minus({ minutes: 1 })) {
        console.warn(`schedule-subscriber-notifications: Skipping past notification: ${notification.send_at} (now: ${nowUtc.toISO()}) for subscriber ${notification.user_id}`);
      }
    }
    
    console.log(`schedule-subscriber-notifications: Scheduling ${notifications.length} notifications for subscriber automation ${automationId}:`);
    notifications.forEach(n => {
      console.log(`  → Subscriber ${n.user_id}: send_at=${n.send_at} UTC`);
    });

    // 1. Delete existing pending scheduled notifications for this automation and type
    console.log(`schedule-subscriber-notifications: Attempting to delete existing pending subscriber notifications for automation ${automationId}.`);
    const { error: deleteError } = await supabaseAdmin
      .from('scheduled_notifications')
      .delete()
      .eq('automation_id', automationId)
      .eq('type', 'subscriber_notification') // Filter by the new type
      .eq('user_id', adminUserId) // Ensure admin only deletes their own subscriber automations
      .eq('status', 'pending');

    if (deleteError) {
      console.error(`schedule-subscriber-notifications: Failed to delete existing pending notifications: ${deleteError.message}`);
      throw new Error(`Failed to delete existing pending notifications: ${deleteError.message}`);
    }
    console.log(`schedule-subscriber-notifications: Successfully deleted existing pending subscriber notifications for automation ${automationId}.`);

    // 2. Insert new scheduled notifications
    if (notifications.length > 0) {
      const notificationsToInsert = notifications.map(n => ({
        user_id: n.user_id, // This is the subscriber's user_id
        client_id: n.user_id, // For subscriber notifications, client_id is the subscriber's user_id
        template_id: n.subscriber_template_id,
        automation_id: automationId,
        send_at: n.send_at,
        status: 'pending',
        type: 'subscriber_notification', // Set the new type
      }));

      const { error: insertError } = await supabaseAdmin
        .from('scheduled_notifications')
        .insert(notificationsToInsert);

      if (insertError) {
        console.error(`schedule-subscriber-notifications: Failed to insert scheduled notifications: ${insertError.message}`);
        throw new Error(`Failed to insert scheduled notifications: ${insertError.message}`);
      }
      console.log(`schedule-subscriber-notifications: Successfully inserted ${notificationsToInsert.length} scheduled notifications.`);
    } else {
      console.log('schedule-subscriber-notifications: No new notifications to insert.');
    }

    return new Response(JSON.stringify({ success: true, message: 'Subscriber notifications scheduled successfully.', count: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(`schedule-subscriber-notifications: An unexpected error occurred for automation ${automationIdForLog || 'N/A'}: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});