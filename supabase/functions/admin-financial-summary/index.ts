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
interface AdminFinancialEntry {
  value: number;
  created_at: string;
}

interface SubscriptionSummary {
  price: number;
  next_billing_date: string;
  status: string;
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

    // Fetch user role using service role to bypass RLS for user_roles table
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userRoleData, error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRoleError || userRoleData?.role !== 'admin') {
      console.warn('Edge Function: Unauthorized access attempt by non-admin user:', user.id);
      return new Response(JSON.stringify({ error: 'Access denied: Admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Edge Function: Admin user confirmed.');

    const now = DateTime.local(); // Current local time
    const todayStart = now.startOf('day');
    const todayEnd = now.plus({ days: 1 }).startOf('day'); // Exclusive end: start of tomorrow

    // Luxon's startOf('week') defaults to Monday. To match date-fns weekStartsOn: 0 (Sunday),
    // we need to set locale or explicitly adjust. 'en-US' starts on Sunday.
    const weekStart = now.setLocale('en-US').startOf('week');
    const weekEnd = weekStart.plus({ weeks: 1 }).startOf('day'); // Exclusive end: start of next week

    const monthStart = now.startOf('month');
    const monthEnd = monthStart.plus({ months: 1 }).startOf('day'); // Exclusive end: start of next month

    // --- Valores Recebidos (admin_financial_entries) ---
    const { data: adminFinancialEntries, error: financialError } = await supabaseAdmin
      .from('admin_financial_entries')
      .select('value, created_at')
      .eq('type', 'credit');

    if (financialError) throw financialError;
    console.log('Edge Function: adminFinancialEntries fetched, count:', adminFinancialEntries?.length || 0);

    let receivedToday = 0;
    let receivedThisWeek = 0;
    let receivedThisMonth = 0;

    (adminFinancialEntries as AdminFinancialEntry[] || []).forEach((entry: AdminFinancialEntry) => {
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

    // --- Previsão de Recebíveis (subscriptions) ---
    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .select('price, next_billing_date, status')
      .eq('status', 'active'); // Apenas assinaturas ativas geram recebíveis

    if (subscriptionsError) throw subscriptionsError;
    console.log('Edge Function: subscriptions fetched, count:', subscriptions?.length || 0);

    let receivableToday = 0;
    let receivableTomorrow = 0;
    let receivableThisWeek = 0;
    let receivableThisMonth = 0;

    const tomorrowStart = now.plus({ days: 1 }).startOf('day');
    const tomorrowEnd = now.plus({ days: 2 }).startOf('day'); // Exclusive end: start of day after tomorrow

    (subscriptions as SubscriptionSummary[] || []).forEach((sub: SubscriptionSummary) => {
      if (!sub.next_billing_date) return;
      const dueDate = DateTime.fromISO(sub.next_billing_date, { zone: 'local' }).startOf('day'); // Treat as local date, start of day

      if (dueDate >= todayStart && dueDate < todayEnd) {
        receivableToday += sub.price;
      }
      if (dueDate >= tomorrowStart && dueDate < tomorrowEnd) {
        receivableTomorrow += sub.price;
      }
      if (dueDate >= weekStart && dueDate < weekEnd) {
        receivableThisWeek += sub.price;
      }
      if (dueDate >= monthStart && dueDate < monthEnd) {
        receivableThisMonth += sub.price;
      }
    });

    // --- Valores Perdidos (Churn de Assinantes) ---
    // For direct Supabase queries, we need YYYY-MM-DD strings.
    // Use Luxon's toISODate() for this.
    const { data: churnedSubscriptionsToday, error: churnedTodayError } = await supabaseAdmin
      .from('subscriptions')
      .select('price')
      .in('status', ['inactive', 'overdue'])
      .gte('next_billing_date', todayStart.toISODate())
      .lt('next_billing_date', todayEnd.toISODate()); // Use lt for exclusive end
    if (churnedTodayError) throw churnedTodayError;
    const lostValueToday = (churnedSubscriptionsToday as { price: number }[] || []).reduce((sum: number, sub: { price: number }) => sum + sub.price, 0);
    console.log('Edge Function: lostValueToday calculated:', lostValueToday);

    const { data: churnedSubscriptionsThisWeek, error: churnedThisWeekError } = await supabaseAdmin
      .from('subscriptions')
      .select('price')
      .in('status', ['inactive', 'overdue'])
      .gte('next_billing_date', weekStart.toISODate())
      .lt('next_billing_date', weekEnd.toISODate()); // Use lt for exclusive end
    if (churnedThisWeekError) throw churnedThisWeekError;
    const lostValueThisWeek = (churnedSubscriptionsThisWeek as { price: number }[] || []).reduce((sum: number, sub: { price: number }) => sum + sub.price, 0);
    console.log('Edge Function: lostValueThisWeek calculated:', lostValueThisWeek);

    const { data: churnedSubscriptionsThisMonth, error: churnedThisMonthError } = await supabaseAdmin
      .from('subscriptions')
      .select('price')
      .in('status', ['inactive', 'overdue'])
      .gte('next_billing_date', monthStart.toISODate())
      .lt('next_billing_date', monthEnd.toISODate()); // Use lt for exclusive end
    if (churnedThisMonthError) throw churnedThisMonthError;
    const lostValueThisMonth = (churnedSubscriptionsThisMonth as { price: number }[] || []).reduce((sum: number, sub: { price: number }) => sum + sub.price, 0);
    console.log('Edge Function: lostValueThisMonth calculated:', lostValueThisMonth);


    console.log('Edge Function: Admin financial summary data prepared successfully.');

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
    console.error('Edge Function: Error fetching admin financial summary:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred in the financial summary function.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});