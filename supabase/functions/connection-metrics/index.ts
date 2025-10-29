// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-ignore
import * as dateFns from 'npm:date-fns@3.6.0'; // Use npm: for date-fns
// @ts-ignore
import { toZonedTime } from 'npm:date-fns-tz@3.2.0'; // Updated to v3 - renamed from utcToZonedTime

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define interfaces for detailed history items
interface DetailedHistoryItem {
  id: string;
  clientName: string;
  templateName: string;
  eventDate: string; // This will be send_at or sent_at
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string | null;
  requestPayload?: any | null; // Adicionado
  responsePayload?: any | null; // Adicionado
}

// Interfaces for raw data from Supabase queries
interface ScheduledNotificationRow {
  id: string;
  send_at: string;
  status: 'pending';
  clients: { name: string } | null;
  templates: { name: string } | null;
}

interface N8nMessageSenderHistoryRow { // Renomeado para refletir a nova tabela
  id: string;
  timestamp: string; 
  status_code: number | null; 
  webhook_type: string; 
  clients: { name: string } | null;
  templates: { name: string } | null;
  error_message?: string | null; 
  request_payload?: any | null; 
  response_payload?: any | null; 
  client_name_snapshot?: string | null; // Added for deleted clients
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      console.error('Edge Function: User authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status'); // Get the status query parameter

    // Fetch user role
    const { data: userRoleData, error: userRoleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (userRoleError && userRoleError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Edge Function: Error fetching user role:', userRoleError.message);
      throw userRoleError;
    }
    const userRole = userRoleData?.role || 'user'; // Default to 'user' if no role found

    // Conditionally apply user_id filter
    const applyUserIdFilter = (query: any) => {
      return userRole === 'admin' ? query : query.eq('user_id', userId);
    };

    // --- Detailed List Logic ---
    if (statusFilter === 'pending' || statusFilter === 'success' || statusFilter === 'failed') {
      let detailedData: DetailedHistoryItem[] = [];
      let query;

      if (statusFilter === 'pending') {
        query = applyUserIdFilter(
          supabase
            .from('scheduled_notifications')
            .select(`
              id,
              send_at,
              status,
              clients(name),
              templates(name)
            `)
        )
          .eq('status', 'pending')
          .order('send_at', { ascending: false });
      } else { // 'success' or 'failed'
        query = applyUserIdFilter(
          supabase
            .from('n8n_message_sender_history') // Alterado para n8n_message_sender_history
            .select(`
              id,
              timestamp,
              status_code,
              webhook_type,
              request_payload,
              response_payload,
              client_name_snapshot,
              clients:clients(name),
              templates:templates(name)
            `)
        )
          .in('webhook_type', ['n8n_message_outbound', 'n8n_message_outbound_automated']) // Filtrar por tipos de webhook de mensagem
          .order('timestamp', { ascending: false });
          
          if (statusFilter === 'success') {
            query = query.eq('status_code', 200);
          } else if (statusFilter === 'failed') {
            query = query.or('status_code.neq.200,status_code.is.null'); // MODIFICADO: Incluir status_code nulo como falha
          }
      }

      const { data, error: detailedError } = await query;

      if (detailedError) throw detailedError;

      detailedData = (data || []).map((item: any) => { // Usar 'any' temporariamente para flexibilidade
        if (statusFilter === 'pending') {
          const scheduledItem = item as ScheduledNotificationRow;
          return {
            id: scheduledItem.id,
            clientName: scheduledItem.clients?.name || 'Cliente Desconhecido',
            templateName: scheduledItem.templates?.name || 'Template Desconhecido',
            eventDate: scheduledItem.send_at,
            status: scheduledItem.status,
          };
        } else {
          const historyItem = item as N8nMessageSenderHistoryRow; // Usar o novo tipo
          // Use snapshot if client is deleted, otherwise use current client name
          const clientName = historyItem.clients?.name 
            ? historyItem.clients.name 
            : historyItem.client_name_snapshot 
              ? `${historyItem.client_name_snapshot} (Deletado)` 
              : 'Cliente Desconhecido';
          
          return {
            id: historyItem.id,
            clientName,
            templateName: historyItem.templates?.name || 'Template Desconhecido',
            eventDate: historyItem.timestamp, // Usar timestamp do webhook_history
            status: historyItem.status_code && historyItem.status_code >= 200 && historyItem.status_code < 300 ? 'success' : 'failed', // Mapear status_code para 'success'/'failed'
            requestPayload: historyItem.request_payload,
            responsePayload: historyItem.response_payload,
          };
        }
      });

      return new Response(JSON.stringify({ detailedData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // --- Existing Metrics and Recent History Logic (if no statusFilter) ---
    // Agendados: Contagem de scheduled_notifications com status 'pending'
    const { count: scheduledCount, error: scheduledError } = await applyUserIdFilter(
      supabase
        .from('scheduled_notifications')
        .select('*', { count: 'exact', head: true })
    )
      .eq('status', 'pending');

    if (scheduledError) throw scheduledError;

    // Enviados: Contagem de n8n_message_sender_history com status_code 200
    const { count: sentCount, error: sentError } = await applyUserIdFilter(
      supabase
        .from('n8n_message_sender_history') // Alterado para n8n_message_sender_history
        .select('*', { count: 'exact', head: true })
    )
      .in('webhook_type', ['n8n_message_outbound', 'n8n_message_outbound_automated']) // Incluir ambos os tipos
      .eq('status_code', 200);

    if (sentError) throw sentError;

    // Falhas: Contagem de n8n_message_sender_history com status_code diferente de 200 OU status_code é NULL
    const { count: failedCount, error: failedError } = await applyUserIdFilter(
      supabase
        .from('n8n_message_sender_history') // Alterado para n8n_message_sender_history
        .select('*', { count: 'exact', head: true })
    )
      .in('webhook_type', ['n8n_message_outbound', 'n8n_message_outbound_automated']) // Incluir ambos os tipos
      .or('status_code.neq.200,status_code.is.null'); // MODIFICADO: Incluir status_code nulo como falha

    if (failedError) throw failedError;

    // Histórico de Envios (recentes, para o dashboard principal)
    const { data: historyData, error: historyError } = await applyUserIdFilter(
      supabase
        .from('n8n_message_sender_history') // Alterado para n8n_message_sender_history
        .select(`
          id,
          timestamp,
          status_code,
          client_name_snapshot,
          clients:clients(name),
          templates:templates(name)
        `)
    )
      .in('webhook_type', ['n8n_message_outbound', 'n8n_message_outbound_automated']) // Incluir ambos os tipos
      .order('timestamp', { ascending: false })
      .limit(10);

    if (historyError) throw historyError;

    const formattedHistory = (historyData || []).map((item: any) => {
      // Use snapshot if client is deleted, otherwise use current client name
      const clientName = item.clients?.name 
        ? item.clients.name 
        : item.client_name_snapshot 
          ? `${item.client_name_snapshot} (Deletado)` 
          : 'Cliente Desconhecido';
      
      return {
        id: item.id,
        clientName,
        templateName: item.templates?.name || 'Template Desconhecido',
        sentDate: new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: item.status_code && item.status_code >= 200 && item.status_code < 300 ? 'success' : 'failed',
      };
    });

    const responsePayload = {
      metrics: {
        sent: sentCount || 0,
        scheduled: scheduledCount || 0,
        failed: failedCount || 0,
      },
      history: formattedHistory,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge Function: An unexpected error occurred:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});