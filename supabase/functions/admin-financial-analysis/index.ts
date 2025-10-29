// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interfaces para tipagem dos dados do Supabase
interface AdminFinancialEntry {
  value: number;
  created_at: string;
}

interface SubscriptionData {
  user_id: string;
  price: number;
  next_billing_date: string;
  created_at: string;
  status: string;
  plan_name: string; // Adicionado plan_name
}

interface ProfileData {
  id: string;
  created_at: string;
}

interface SubscriberPlanData {
  id: string;
  name: string;
  value: number;
  is_free: boolean;
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

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // --- Fetch all subscriber plans and create a map (NEW) ---
    const { data: subscriberPlansData, error: subscriberPlansError } = await supabaseAdmin
      .from('subscriber_plans')
      .select('id, name, value, is_free');

    if (subscriberPlansError) throw subscriberPlansError;
    const subscriberPlansMap = new Map<string, SubscriberPlanData>(
      (subscriberPlansData || []).map((plan: SubscriberPlanData) => [plan.name, plan])
    );
    console.log('Edge Function: Subscriber plans fetched and mapped.');

    // --- Valores Recebidos (admin_financial_entries) ---
    const { data: adminFinancialEntries, error: financialError } = await supabaseAdmin
      .from('admin_financial_entries')
      .select('value, created_at')
      .eq('type', 'credit');

    if (financialError) throw financialError;
    console.log('Edge Function: adminFinancialEntries fetched, count:', adminFinancialEntries?.length || 0);

    let receivedThisMonth = 0; // Para currentMonthRevenue
    let receivedPreviousMonth = 0; // Para previousMonthRevenue

    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    (adminFinancialEntries as AdminFinancialEntry[] || []).forEach((entry: AdminFinancialEntry) => {
      const entryDate = new Date(entry.created_at);
      if (entryDate >= monthStart && entryDate < monthEnd) {
        receivedThisMonth += entry.value;
      } else if (entryDate >= previousMonthStart && entryDate < previousMonthEnd) {
        receivedPreviousMonth += entry.value;
      }
    });

    // --- Dados de Assinaturas (subscriptions) e Perfis (profiles) ---
    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, price, next_billing_date, created_at, status, plan_name'); // Adicionado plan_name

    if (subscriptionsError) throw subscriptionsError;
    console.log('Edge Function: subscriptions fetched, count:', subscriptions?.length || 0);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, created_at');

    if (profilesError) throw profilesError;
    console.log('Edge Function: profiles fetched, count:', profiles?.length || 0);

    let newSubscribersThisMonth = 0;
    let activeSubscribers = 0;
    let revenueForecast = 0; // Baseado em assinaturas ativas para o mês atual

    const subscriberCreationMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const subscriberCreationMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const activeSubscriberIds = new Set<string>();

    (subscriptions as SubscriptionData[] || []).forEach((sub: SubscriptionData) => {
      const subCreationDate = new Date(sub.created_at);
      if (subCreationDate >= subscriberCreationMonthStart && subCreationDate < subscriberCreationMonthEnd) {
        // Check if the user associated with this subscription is actually new this month
        const profileCreatedThisMonth = (profiles as ProfileData[] || []).some(p => 
          p.id === sub.user_id && new Date(p.created_at) >= subscriberCreationMonthStart && new Date(p.created_at) < subscriberCreationMonthEnd
        );
        if (profileCreatedThisMonth) {
          newSubscribersThisMonth++;
        }
      }
      if (sub.status === 'active') {
        activeSubscriberIds.add(sub.user_id); // Count unique active subscribers
        if (sub.next_billing_date) {
          const dueDate = new Date(sub.next_billing_date + 'T00:00:00'); // Tratar como data local
          if (dueDate >= monthStart && dueDate < monthEnd) {
            revenueForecast += sub.price;
          }
        }
      }
    });
    activeSubscribers = activeSubscriberIds.size;

    // --- KPIs Calculation ---
    const currentMonthRevenue = receivedThisMonth;
    const previousMonthRevenue = receivedPreviousMonth;

    const monthlyGrowthPercentage = previousMonthRevenue > 0
      ? ((currentMonthRevenue / previousMonthRevenue) - 1) * 100
      : (currentMonthRevenue > 0 ? 100 : 0);

    const kpis = {
      currentMonthRevenue,
      previousMonthRevenue,
      monthlyGrowthPercentage,
      newSubscribersThisMonth: newSubscribersThisMonth, // Renomeado
      activeSubscribers: activeSubscribers, // Renomeado
      revenueForecast: currentMonthRevenue + revenueForecast, // Total de receita do mês + previsão de recebíveis
    };

    // --- Churn Analysis Calculation ---
    const { data: churnedSubscriptionsData, error: churnedSubscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        user_id,
        price,
        plan_name
      `) // Selecionar plan_name diretamente
      .in('status', ['inactive', 'overdue'])
      .gte('next_billing_date', monthStart.toISOString().split('T')[0])
      .lte('next_billing_date', new Date(monthEnd.getTime() - 1).toISOString().split('T')[0]);

    if (churnedSubscriptionsError) throw churnedSubscriptionsError;

    let lostSubscribersThisMonth = 0;
    let lostRevenueThisMonth = 0;
    const churnByPlanMap = new Map<string, { planName: string; lostCount: number }>();

    (churnedSubscriptionsData || []).forEach((sub: any) => { // sub agora tem plan_name
      const planDetails = subscriberPlansMap.get(sub.plan_name); // Usar o mapa
      const planName = planDetails?.name || sub.plan_name || 'Plano Desconhecido';
      const subPrice = sub.price || 0;

      if (!churnByPlanMap.has(planName)) {
        churnByPlanMap.set(planName, { planName, lostCount: 0 });
      }
      churnByPlanMap.get(planName)!.lostCount++;

      lostSubscribersThisMonth++;
      lostRevenueThisMonth += subPrice;
    });

    const churnByPlan = Array.from(churnByPlanMap.values()).sort((a, b) => b.lostCount - a.lostCount);

    const totalSubscribersForChurn = activeSubscribers + lostSubscribersThisMonth;
    const churnRate = totalSubscribersForChurn > 0
      ? (lostSubscribersThisMonth / totalSubscribersForChurn) * 100
      : 0;

    const churnAnalysis = {
      lostSubscribersThisMonth,
      lostRevenueThisMonth,
      churnRate,
      churnByPlan,
    };

    // --- Revenue Last 30 Days (from admin_financial_entries) ---
    const revenueLast30DaysMap = new Map<string, number>();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      revenueLast30DaysMap.set(dateStr, 0);
    }

    (adminFinancialEntries as AdminFinancialEntry[] || []).forEach((entry: AdminFinancialEntry) => {
      const entryDate = new Date(entry.created_at);
      const entryDateStr = entryDate.toISOString().split('T')[0];
      if (revenueLast30DaysMap.has(entryDateStr)) {
        revenueLast30DaysMap.set(entryDateStr, revenueLast30DaysMap.get(entryDateStr)! + entry.value);
      }
    });

    // --- Weekly Revenue Comparison (from admin_financial_entries) ---
    const weeklyRevenueComparison: { [key: string]: { currentMonth: number; previousMonth: number } } = {};

    const getWeekNumber = (date: Date) => {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const diff = date.getTime() - startOfYear.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
    };

    const processWeeklyRevenue = (entries: AdminFinancialEntry[] | null, monthStart: Date, monthEnd: Date, targetObject: any, monthKey: 'currentMonth' | 'previousMonth') => {
      const monthEntries = (entries || []).filter((entry: AdminFinancialEntry) => {
        const entryDate = new Date(entry.created_at);
        return entryDate >= monthStart && entryDate < monthEnd;
      });

      monthEntries.forEach((entry: AdminFinancialEntry) => {
        const entryDate = new Date(entry.created_at);
        const weekNum = getWeekNumber(entryDate);
        const weekKey = `week${weekNum}`;

        if (!targetObject[weekKey]) {
          targetObject[weekKey] = { currentMonth: 0, previousMonth: 0 };
        }
        targetObject[weekKey][monthKey] += entry.value;
      });
    };

    processWeeklyRevenue(adminFinancialEntries, monthStart, monthEnd, weeklyRevenueComparison, 'currentMonth');
    processWeeklyRevenue(adminFinancialEntries, previousMonthStart, previousMonthEnd, weeklyRevenueComparison, 'previousMonth');

    const allWeekKeys = new Set<string>();
    Object.keys(weeklyRevenueComparison).forEach(key => allWeekKeys.add(key));
    for (const key of allWeekKeys) {
      if (!weeklyRevenueComparison[key].currentMonth) weeklyRevenueComparison[key].currentMonth = 0;
      if (!weeklyRevenueComparison[key].previousMonth) weeklyRevenueComparison[key].previousMonth = 0;
    }

    // --- Revenue by Subscriber Plan (Current Month) ---
    const revenueByPlanData: { planName: string; totalRevenue: number }[] = [];
    const tempRevenueByPlan = new Map<string, number>();

    (subscriptions as SubscriptionData[] || []).forEach((sub: SubscriptionData) => {
      if (sub.status === 'active' && sub.next_billing_date) {
        const dueDate = new Date(sub.next_billing_date + 'T00:00:00'); // Tratar como data local
        if (dueDate >= monthStart && dueDate < monthEnd) {
          // Find the plan name from subscriber_plans based on subscription's plan_name (string)
          // This assumes subscription.plan_name directly matches subscriber_plans.name
          const planDetails = subscriberPlansMap.get(sub.plan_name); // Usar o mapa
          const planName = planDetails?.name || sub.plan_name || 'Plano Desconhecido';
          tempRevenueByPlan.set(planName, (tempRevenueByPlan.get(planName) || 0) + sub.price);
        }
      }
    });

    tempRevenueByPlan.forEach((totalRevenue, planName) => {
      revenueByPlanData.push({ planName, totalRevenue });
    });

    // --- Monthly Revenue History (Last 12 Months from admin_financial_entries) ---
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    const twelveMonthsAgoStart = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: monthlyEntriesHistory, error: monthlyEntriesHistoryError } = await supabaseAdmin
      .from('admin_financial_entries')
      .select('value, created_at')
      .eq('type', 'credit')
      .gte('created_at', twelveMonthsAgoStart.toISOString())
      .lte('created_at', currentMonthEnd.toISOString());

    if (monthlyEntriesHistoryError) throw monthlyEntriesHistoryError;
    console.log('Edge Function: monthlyEntriesHistory fetched, count:', monthlyEntriesHistory?.length || 0);

    const monthlyRevenueHistoryMap = new Map<string, number>();
    (monthlyEntriesHistory as AdminFinancialEntry[] || []).forEach((entry: AdminFinancialEntry) => {
      const entryDate = new Date(entry.created_at);
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenueHistoryMap.set(monthKey, (monthlyRevenueHistoryMap.get(monthKey) || 0) + entry.value);
    });

    const monthlyRevenueHistory: { month: string; revenue: number }[] = [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let currentMonthIterator = new Date(twelveMonthsAgoStart);
    while (currentMonthIterator < currentMonthEnd) {
      const monthKey = `${currentMonthIterator.getFullYear()}-${String(currentMonthIterator.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${months[currentMonthIterator.getMonth()]}/${String(currentMonthIterator.getFullYear()).slice(2)}`;
      monthlyRevenueHistory.push({
        month: monthLabel,
        revenue: monthlyRevenueHistoryMap.get(monthKey) || 0,
      });
      currentMonthIterator.setMonth(currentMonthIterator.getMonth() + 1);
    }

    console.log('Edge Function: Admin financial analysis data prepared successfully.');

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
    console.error('Edge Function: Error fetching admin financial analysis:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred in the admin financial analysis function.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});