// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-ignore
import { DateTime } from 'https://esm.sh/luxon@3.4.4'; // Use Luxon

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interfaces para tipagem dos dados do Supabase
interface FinancialEntry {
  value: number;
  created_at: string;
}

interface ClientSummary {
  value: number;
  next_billing_date: string;
}

interface ChurnClient {
  value: number | null;
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
    console.log('Edge Function: User authenticated, userId:', user.id);

    const userId = user.id;

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
    
    const now = DateTime.local(); // Current local time
    const todayStart = now.startOf('day');
    const todayEnd = now.plus({ days: 1 }).startOf('day'); // Exclusive end: start of tomorrow

    // Luxon's startOf('week') defaults to Monday. To match date-fns weekStartsOn: 0 (Sunday),
    // we need to set locale or explicitly adjust. 'en-US' starts on Sunday.
    const weekStart = now.setLocale('en-US').startOf('week');
    const weekEnd = weekStart.plus({ weeks: 1 }).startOf('day'); // Exclusive end: start of next week

    const monthStart = now.startOf('month');
    const monthEnd = monthStart.plus({ months: 1 }).startOf('day'); // Exclusive end: start of next month

    // --- Valores Recebidos (financial_entries) ---
    const { data: financialEntries, error: financialError } = await applyUserIdFilter(
      supabase
        .from('financial_entries')
        .select('value, created_at')
    )
      .eq('type', 'credit');

    if (financialError) throw financialError;
    console.log('Edge Function: financialEntries fetched, count:', financialEntries?.length || 0);

    let receivedToday = 0;
    let receivedThisWeek = 0;
    let receivedThisMonth = 0;

    (financialEntries as FinancialEntry[] || []).forEach((entry: FinancialEntry) => {
      const entryDateTime = DateTime.fromISO(entry.created_at, { zone: 'utc' }).toLocal(); // Convert to local for comparison
      if (entryDateTime >= todayStart && entryDateTime < todayEnd) {
        receivedToday += entry.value;
      }
      if (entryDateTime >= weekStart && entryDateTime < weekEnd) {
        receivedThisWeek += entry.value;
      }
      if (entryDateTime >= monthStart && entryDateTime < monthEnd) {
        receivedThisMonth += entry.value;
      }
    });

    // --- Previsão de Recebíveis (clients) ---
    const { data: clients, error: clientsError } = await applyUserIdFilter(
      supabase
        .from('clients')
        .select('value, next_billing_date')
    )
      .eq('status', 'active');

    if (clientsError) throw clientsError;
    console.log('Edge Function: clients fetched, count:', clients?.length || 0);

    let receivableToday = 0;
    let receivableTomorrow = 0;
    let receivableThisWeek = 0;
    let receivableThisMonth = 0;

    const tomorrowStart = now.plus({ days: 1 }).startOf('day');
    const tomorrowEnd = now.plus({ days: 2 }).startOf('day'); // Exclusive end: start of day after tomorrow

    (clients as ClientSummary[] || []).forEach((client: ClientSummary) => {
      if (!client.next_billing_date) return;
      const dueDate = DateTime.fromISO(client.next_billing_date, { zone: 'local' }).startOf('day'); // Treat as local date, start of day

      if (dueDate >= todayStart && dueDate < todayEnd) {
        receivableToday += client.value;
      }
      if (dueDate >= tomorrowStart && dueDate < tomorrowEnd) {
        receivableTomorrow += client.value;
      }
      if (dueDate >= weekStart && dueDate < weekEnd) {
        receivableThisWeek += client.value;
      }
      if (dueDate >= monthStart && dueDate < monthEnd) {
        receivableThisMonth += client.value;
      }
    });

    // --- Valores Perdidos (Churn) ---
    const { data: churnClientsToday, error: churnClientsTodayError } = await applyUserIdFilter(
      supabase
        .from('clients')
        .select('value')
    )
      .in('status', ['inactive', 'overdue'])
      .gte('next_billing_date', todayStart.toISODate())
      .lt('next_billing_date', todayEnd.toISODate()); // Use lt for exclusive end
    if (churnClientsTodayError) throw churnClientsTodayError;
    const lostValueToday = (churnClientsToday as ChurnClient[] || []).reduce((sum: number, client: ChurnClient) => sum + (client.value || 0), 0);
    console.log('Edge Function: lostValueToday calculated:', lostValueToday);

    const { data: churnClientsThisWeek, error: churnClientsThisWeekError } = await applyUserIdFilter(
      supabase
        .from('clients')
        .select('value')
    )
      .in('status', ['inactive', 'overdue'])
      .gte('next_billing_date', weekStart.toISODate())
      .lt('next_billing_date', weekEnd.toISODate()); // Use lt for exclusive end
    if (churnClientsThisWeekError) throw churnClientsThisWeekError;
    const lostValueThisWeek = (churnClientsThisWeek as ChurnClient[] || []).reduce((sum: number, client: ChurnClient) => sum + (client.value || 0), 0);
    console.log('Edge Function: lostValueThisWeek calculated:', lostValueThisWeek);

    const { data: churnClientsThisMonth, error: churnClientsThisMonthError } = await applyUserIdFilter(
      supabase
        .from('clients')
        .select('value')
    )
      .in('status', ['inactive', 'overdue'])
      .gte('next_billing_date', monthStart.toISODate())
      .lt('next_billing_date', monthEnd.toISODate()); // Use lt for exclusive end
    if (churnClientsThisMonthError) throw churnClientsThisMonthError;
    const lostValueThisMonth = (churnClientsThisMonth as ChurnClient[] || []).reduce((sum: number, client: ChurnClient) => sum + (client.value || 0), 0);
    console.log('Edge Function: lostValueThisMonth calculated:', lostValueThisMonth);

    console.log('Edge Function: Financial summary data prepared successfully.');

    return new Response(
      JSON.stringify({
        receivedToday,
        receivedThisWeek,
        receivedThisMonth,
        receivableToday,
        receivableTomorrow,
        receivableThisWeek,
        receivableThisMonth,
        lostValueToday,
        lostValueThisWeek,
        lostValueThisMonth,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Edge Function: Error fetching financial summary:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred in the financial summary function.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});