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

// Removed: interface ClientWithPlan {
// Removed:   value: number;
// Removed:   next_billing_date: string;
// Removed:   created_at: string;
// Removed:   status: string;
// Removed:   plans: { name: string; id: string; value: number }[] | { name: string; id: string; value: number } | null;
// Removed: }

// Removed: interface LostClient {
// Removed:   id: string;
// Removed:   value: number | null;
// Removed:   plans: { name: string }[] | { name: string } | null;
// Removed: }

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

    const monthStart = now.startOf('month');
    const monthEnd = monthStart.plus({ months: 1 }).startOf('day'); // Exclusive end: start of next month

    const previousMonthStart = now.minus({ months: 1 }).startOf('month');
    const previousMonthEnd = previousMonthStart.plus({ months: 1 }).startOf('day'); // Exclusive end: start of current month

    // --- Valores Recebidos (financial_entries) ---
    const { data: financialEntries, error: financialError } = await applyUserIdFilter(
      supabase
        .from('financial_entries')
        .select('value, created_at')
    )
      .eq('type', 'credit');

    if (financialError) throw financialError;
    console.log('Edge Function: financialEntries fetched, count:', financialEntries?.length || 0);

    let receivedThisMonth = 0; // Para currentMonthRevenue
    let receivedPreviousMonth = 0; // Para previousMonthRevenue

    (financialEntries as FinancialEntry[] || []).forEach((entry: FinancialEntry) => {
      const entryDateTime = DateTime.fromISO(entry.created_at, { zone: 'utc' }).toLocal(); // Convert to local for comparison
      if (entryDateTime >= monthStart && entryDateTime < monthEnd) {
        receivedThisMonth += entry.value;
      } else if (entryDateTime >= previousMonthStart && entryDateTime < previousMonthEnd) {
        receivedPreviousMonth += entry.value;
      }
    });

    // --- Previsão de Recebíveis (clients) ---
    const { data: clients, error: clientsError } = await applyUserIdFilter(
      supabase
        .from('clients')
        .select('value, next_billing_date, created_at, status, plans(name, id, value)')
    );

    if (clientsError) throw clientsError;
    console.log('Edge Function: clients fetched, count:', clients?.length || 0);

    let newClientsThisMonth = 0;
    let activeClients = 0;
    let receivableThisMonth = 0; // Para revenueForecast

    const clientCreationMonthStart = now.startOf('month');
    const clientCreationMonthEnd = clientCreationMonthStart.plus({ months: 1 }).startOf('day'); // Exclusive end

    (clients || []).forEach((client: any) => {
      // Removed: const planData = Array.isArray(client.plans) ? client.plans[0] : client.plans;
      const clientCreationDateTime = DateTime.fromISO(client.created_at, { zone: 'utc' }).toLocal(); // Convert to local for comparison
      if (clientCreationDateTime >= clientCreationMonthStart && clientCreationDateTime < clientCreationMonthEnd) {
        newClientsThisMonth++;
      }
      if (client.status === 'active') {
        activeClients++;
        if (client.next_billing_date) {
          const dueDate = DateTime.fromISO(client.next_billing_date, { zone: 'local' }).startOf('day'); // Treat as local date, start of day
          if (dueDate >= monthStart && dueDate < monthEnd) {
            receivableThisMonth += client.value;
          }
        }
      }
    });

    // --- KPIs Calculation ---
    const currentMonthRevenue = receivedThisMonth;
    const previousMonthRevenue = receivedPreviousMonth;

    const monthlyGrowthPercentage = previousMonthRevenue > 0
      ? ((currentMonthRevenue / previousMonthRevenue) - 1) * 100
      : (currentMonthRevenue > 0 ? 100 : 0);

    const revenueForecast = currentMonthRevenue + receivableThisMonth;

    const kpis = {
      currentMonthRevenue,
      previousMonthRevenue,
      monthlyGrowthPercentage,
      newClientsThisMonth,
      activeClients,
      revenueForecast,
    };

    // --- Churn Analysis Calculation (for Analise page) ---
    const { data: lostClientsData, error: lostClientsError } = await applyUserIdFilter(
      supabase
        .from('clients')
        .select(`
          id,
          value,
          plans ( name )
        `)
    )
      .in('status', ['inactive', 'overdue'])
      .gte('next_billing_date', monthStart.toISODate())
      .lt('next_billing_date', monthEnd.toISODate()); // Use lt for exclusive end

    if (lostClientsError) throw lostClientsError;

    let lostClientsThisMonth = 0;
    let lostRevenueThisMonth = 0;
    const churnByPlanMap = new Map<string, { planName: string; lostCount: number }>();

    (lostClientsData || []).forEach((client: any) => {
      const planData = Array.isArray(client.plans) ? client.plans[0] : client.plans;
      const planName = planData?.name || 'Plano Desconhecido';
      const clientValue = client.value || 0;

      if (!churnByPlanMap.has(planName)) {
        churnByPlanMap.set(planName, { planName, lostCount: 0 });
      }
      churnByPlanMap.get(planName)!.lostCount++;

      lostClientsThisMonth++;
      lostRevenueThisMonth += clientValue;
    });

    const churnByPlan = Array.from(churnByPlanMap.values()).sort((a, b) => b.lostCount - a.lostCount);

    const totalClientsForChurn = activeClients + lostClientsThisMonth; // Corrected calculation for churn rate denominator
    const churnRate = totalClientsForChurn > 0
      ? (lostClientsThisMonth / totalClientsForChurn) * 100
      : 0;

    const churnAnalysis = {
      lostClientsThisMonth,
      lostRevenueThisMonth,
      churnRate,
      churnByPlan,
    };

    // --- Revenue Last 30 Days ---
    const revenueLast30DaysMap = new Map<string, number>();
    const thirtyDaysAgo = now.minus({ days: 29 }).startOf('day'); // Start of day 29 days ago
    
    for (let d = thirtyDaysAgo; d <= now.endOf('day'); d = d.plus({ days: 1 })) { // Iterate up to end of today
      revenueLast30DaysMap.set(d.toISODate(), 0);
    }

    (financialEntries as FinancialEntry[] || []).forEach((entry: FinancialEntry) => {
      const entryDateTime = DateTime.fromISO(entry.created_at, { zone: 'utc' }).toLocal();
      const entryDateStr = entryDateTime.toISODate();
      if (revenueLast30DaysMap.has(entryDateStr)) {
        revenueLast30DaysMap.set(entryDateStr, revenueLast30DaysMap.get(entryDateStr)! + entry.value);
      }
    });

    // --- Weekly Revenue Comparison ---
    const weeklyRevenueComparison: { [key: string]: { currentMonth: number; previousMonth: number } } = {};

    const getWeekNumber = (date: DateTime) => {
      // Luxon's week number is 1-indexed, relative to the start of the year.
      // We need to ensure consistency with how weeks are defined.
      // For simplicity, let's use Luxon's default week number for the year.
      return date.weekNumber;
    };

    const processWeeklyRevenue = (entries: FinancialEntry[] | null, start: DateTime, end: DateTime, targetObject: any, monthKey: 'currentMonth' | 'previousMonth') => {
      const monthEntries = (entries || []).filter((entry: FinancialEntry) => {
        const entryDateTime = DateTime.fromISO(entry.created_at, { zone: 'utc' }).toLocal();
        return entryDateTime >= start && entryDateTime < end;
      });

      monthEntries.forEach((entry: FinancialEntry) => {
        const entryDateTime = DateTime.fromISO(entry.created_at, { zone: 'utc' }).toLocal();
        const weekNum = getWeekNumber(entryDateTime);
        const weekKey = `week${weekNum}`;

        if (!targetObject[weekKey]) {
          targetObject[weekKey] = { currentMonth: 0, previousMonth: 0 };
        }
        targetObject[weekKey][monthKey] += entry.value;
      });
    };

    processWeeklyRevenue(financialEntries, monthStart, monthEnd, weeklyRevenueComparison, 'currentMonth');
    processWeeklyRevenue(financialEntries, previousMonthStart, previousMonthEnd, weeklyRevenueComparison, 'previousMonth');

    const allWeekKeys = new Set<string>();
    Object.keys(weeklyRevenueComparison).forEach(key => allWeekKeys.add(key));
    for (const key of allWeekKeys) {
      if (!weeklyRevenueComparison[key].currentMonth) weeklyRevenueComparison[key].currentMonth = 0;
      if (!weeklyRevenueComparison[key].previousMonth) weeklyRevenueComparison[key].previousMonth = 0; // Fix: ensure previousMonth is also initialized
    }

    // --- Revenue by Plan (Current Month) ---
    const revenueByPlanData: { planName: string; totalRevenue: number }[] = [];
    const tempRevenueByPlan = new Map<string, number>();

    (clients || []).forEach((client: any) => {
      const planData = Array.isArray(client.plans) ? client.plans[0] : client.plans;
      if (client.status === 'active' && planData?.name && planData?.id) {
        const planName = planData.name;
        const planValue = client.value || 0; // Use client.value for revenue by plan
        tempRevenueByPlan.set(planName, (tempRevenueByPlan.get(planName) || 0) + planValue);
      }
    });

    tempRevenueByPlan.forEach((totalRevenue, planName) => {
      revenueByPlanData.push({ planName, totalRevenue });
    });

    // --- Monthly Revenue History (Last 12 Months) ---
    const twelveMonthsAgoStart = now.minus({ months: 11 }).startOf('month'); // Start of month 11 months ago
    const currentMonthEndForHistory = now.endOf('month'); // End of current month for history range

    const { data: monthlyEntriesHistory, error: monthlyEntriesHistoryError } = await applyUserIdFilter(
      supabase
        .from('financial_entries')
        .select('value, created_at')
    )
      .eq('type', 'credit')
      .gte('created_at', twelveMonthsAgoStart.toUTC().toISO()) // Use UTC for DB query
      .lt('created_at', currentMonthEndForHistory.plus({ days: 1 }).toUTC().toISO()); // Use UTC for DB query, exclusive end

    if (monthlyEntriesHistoryError) throw monthlyEntriesHistoryError;
    console.log('Edge Function: monthlyEntriesHistory fetched, count:', monthlyEntriesHistory?.length || 0);

    const monthlyRevenueHistoryMap = new Map<string, number>();
    (monthlyEntriesHistory as FinancialEntry[] || []).forEach((entry: FinancialEntry) => {
      const entryDateTime = DateTime.fromISO(entry.created_at, { zone: 'utc' }).toLocal(); // Convert to local for grouping
      const monthKey = entryDateTime.toFormat('yyyy-MM');
      monthlyRevenueHistoryMap.set(monthKey, (monthlyRevenueHistoryMap.get(monthKey) || 0) + entry.value);
    });

    const monthlyRevenueHistory: { month: string; revenue: number }[] = [];
    let currentMonthIterator = twelveMonthsAgoStart.startOf('month');
    while (currentMonthIterator <= now.startOf('month')) { // Iterate up to start of current month
      const monthKey = currentMonthIterator.toFormat('yyyy-MM');
      const monthLabel = currentMonthIterator.toFormat('MMM/yy');
      monthlyRevenueHistory.push({
        month: monthLabel,
        revenue: monthlyRevenueHistoryMap.get(monthKey) || 0,
      });
      currentMonthIterator = currentMonthIterator.plus({ months: 1 });
    }

    console.log('Edge Function: Financial analysis data prepared successfully.');

    return new Response(
      JSON.stringify({
        kpis,
        revenueLast30Days: Array.from(revenueLast30DaysMap.entries()).map(([date, revenue]) => ({ date, revenue })),
        weeklyRevenueComparison,
        revenueByPlan: revenueByPlanData,
        churnAnalysis,
        monthlyRevenueHistory,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Edge Function: Error fetching financial analysis:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred in the financial analysis function.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});