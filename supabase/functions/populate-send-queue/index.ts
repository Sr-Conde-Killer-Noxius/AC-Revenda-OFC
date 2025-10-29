// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-ignore
import { addDays, format, startOfDay } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the type for the client rows fetched from the database
interface ClientRow {
  id: string;
  user_id: string;
  next_billing_date: string;
  status: 'active' | 'inactive' | 'overdue'; // Assuming these are the enum values
}

// Define the type for automation rows fetched from the database
interface AutomationRow {
  id: string;
  user_id: string;
  days_offset: number;
  template_id: string;
  client_ids: string[];
  created_at: string;
  updated_at: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Edge Function: populate-send-queue started.');

    const today = startOfDay(new Date());
    // Removed: const todayFormatted = format(today, 'yyyy-MM-dd');

    // 1. Buscar todas as regras de automação
    // This function is called by a cron job, so it needs to process all users' automations.
    // RLS on automations table will ensure only admins can see all, but the service role bypasses RLS.
    const { data: automationsData, error: automationsError } = await supabaseAdmin
      .from('automations')
      .select('*');

    if (automationsError) throw automationsError;
    console.log(`Edge Function: Found ${automationsData?.length || 0} automations.`);

    if (!automationsData || automationsData.length === 0) {
      return new Response(JSON.stringify({ message: 'No automations found to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const automations: AutomationRow[] = automationsData as AutomationRow[];

    // 2. Buscar todos os clientes ativos ou vencidos
    // This function is called by a cron job, so it needs to process all users' clients.
    // RLS on clients table will ensure only admins can see all, but the service role bypasses RLS.
    const { data: clientsData, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, user_id, next_billing_date, status');

    if (clientsError) throw clientsError;
    console.log(`Edge Function: Found ${clientsData?.length || 0} clients.`);

    // Cast clientsData to the defined ClientRow type
    const clients: ClientRow[] = clientsData as ClientRow[];
    const clientsMap = new Map(clients.map(c => [c.id, c]));

    const pendingSendsToInsert: any[] = [];

    // 3. Processar Regras
    for (const automation of automations) {
      for (const clientId of automation.client_ids) {
        const client = clientsMap.get(clientId);

        // Ensure the client belongs to the automation's user_id
        if (!client || client.user_id !== automation.user_id || (client.status !== 'active' && client.status !== 'overdue')) {
          // Ignorar clientes não encontrados, não pertencentes ao usuário da automação, ou inativos
          continue;
        }

        const nextBillingDate = new Date(client.next_billing_date + 'T00:00:00'); // Tratar como data local
        const scheduledFor = addDays(nextBillingDate, automation.days_offset);
        const scheduledForFormatted = format(scheduledFor, 'yyyy-MM-dd');

        // Condição: Se a scheduled_for calculada for hoje ou uma data no futuro
        if (scheduledFor >= today) {
          pendingSendsToInsert.push({
            user_id: client.user_id,
            client_id: client.id,
            automation_id: automation.id,
            template_id: automation.template_id,
            scheduled_for: scheduledForFormatted,
          });
        }
      }
    }

    if (pendingSendsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('pending_sends')
        .upsert(pendingSendsToInsert, { 
          onConflict: 'client_id,automation_id,scheduled_for',
          ignoreDuplicates: true 
        });

      if (insertError) throw insertError;
      console.log(`Edge Function: Successfully inserted/skipped ${pendingSendsToInsert.length} pending sends.`);
    } else {
      console.log('Edge Function: No new pending sends to insert.');
    }

    return new Response(JSON.stringify({ message: 'Send queue populated successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge Function: Error populating send queue:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred in populate-send-queue.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});