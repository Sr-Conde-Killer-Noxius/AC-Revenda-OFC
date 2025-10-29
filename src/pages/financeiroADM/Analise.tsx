import { useEffect } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/financeiro/LoadingState"; // Reutilizar LoadingState
import { ErrorState } from "@/components/financeiro/ErrorState"; // Reutilizar ErrorState
import { useAdminFinancialAnalysis } from "@/hooks/useAdminFinancialData"; // Usar o hook admin
import { KpiCard } from "@/components/financeiro/kpis/KpiCard"; // Reutilizar KpiCard
import { ChartCard } from "@/components/financeiro/charts/ChartCard"; // Reutilizar ChartCard
import { CustomTooltip } from "@/components/financeiro/CustomTooltip"; // Reutilizar CustomTooltip
import { DollarSign, Users, TrendingUp, Target, Wallet, UserX, TrendingDown, Percent } from "lucide-react"; // Ícones
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts"; // Gráficos

// Cores para os gráficos (reutilizadas ou adaptadas)
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(250 70% 60%)", // Purple
  "hsl(40 90% 60%)",  // Orange
  "hsl(180 70% 60%)", // Cyan
];

export default function AdminAnalise() {
  const { data: analysis, isLoading, error } = useAdminFinancialAnalysis();

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar análise financeira administrativa", { description: "Não foi possível carregar a análise financeira administrativa. Tente novamente mais tarde." });
    }
  }, [error]);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return "0.00";
    return value.toFixed(2);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  // Adaptação dos dados para os gráficos existentes
  const revenueLast30DaysData = analysis?.revenueLast30Days || [];
  const monthlyRevenueHistoryData = analysis?.monthlyRevenueHistory || [];
  const weeklyRevenueComparisonData = analysis?.weeklyRevenueComparison
    ? Object.keys(analysis.weeklyRevenueComparison).map((weekKey) => ({
        name: `Semana ${weekKey.replace('week', '')}`,
        "Mês Atual": analysis.weeklyRevenueComparison[weekKey].currentMonth,
        "Mês Anterior": analysis.weeklyRevenueComparison[weekKey].previousMonth,
      }))
    : [];
  const revenueByPlanData = analysis?.revenueByPlan || [];
  const churnByPlanData = analysis?.churnAnalysis?.churnByPlan || [];

  return (
    <div className="bg-background min-h-screen text-foreground p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Análise Financeira Admin</h1>
          <p className="text-muted-foreground mt-1">Visão aprofundada da saúde financeira da plataforma.</p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {/* KPI Section */}
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">Indicadores Chave da Plataforma</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"> {/* Revertido para lg:grid-cols-5 */}
              <KpiCard 
                title="Receita no Mês" 
                value={formatCurrency(analysis?.kpis.currentMonthRevenue)} 
                icon={DollarSign} 
                isLoading={isLoading}
              />
              <KpiCard 
                title="Previsão de Receita" 
                value={formatCurrency(analysis?.kpis.revenueForecast)} 
                icon={Wallet} 
                isLoading={isLoading}
              />
              <KpiCard 
                title="Crescimento Mensal" 
                value={formatPercentage(analysis?.kpis.monthlyGrowthPercentage)} 
                unit="%" 
                icon={TrendingUp} 
                growth={analysis?.kpis.monthlyGrowthPercentage} 
                isLoading={isLoading}
              />
              <KpiCard 
                title="Novos Assinantes no Mês" 
                value={analysis?.kpis.newSubscribersThisMonth} 
                icon={Users} 
                isLoading={isLoading}
              />
              <KpiCard 
                title="Total de Assinantes Ativos" 
                value={analysis?.kpis.activeSubscribers} 
                icon={Target} 
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Churn Analysis Section */}
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-4 mt-8 text-foreground">Análise de Churn (Perda de Assinantes)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <KpiCard 
                title="Assinantes Perdidos no Mês" 
                value={analysis?.churnAnalysis.lostSubscribersThisMonth} 
                icon={UserX} 
                isLoading={isLoading}
              />
              <KpiCard 
                title="Receita Recorrente Perdida (MRR)" 
                value={formatCurrency(analysis?.churnAnalysis.lostRevenueThisMonth)} 
                icon={TrendingDown} 
                isLoading={isLoading}
              />
              <KpiCard 
                title="Taxa de Churn Mensal" 
                value={formatPercentage(analysis?.churnAnalysis.churnRate)} 
                unit="%" 
                icon={Percent} 
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Charts Section */}
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-4 mt-8 text-foreground">Gráficos de Desempenho da Plataforma</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Last 30 Days Chart */}
                <ChartCard title="Receita nos Últimos 30 Dias" isLoading={isLoading} className="lg:col-span-2">
                  <ResponsiveContainer>
                    <AreaChart data={revenueLast30DaysData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorFaturamentoAdmin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: "hsl(var(--muted-foreground))" }} 
                        fontSize={12} 
                        tickFormatter={(dateStr: string) => new Date(dateStr).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
                      />
                      <YAxis 
                        tickFormatter={(value: number) => `R$${(value / 1000).toFixed(0)}k`} 
                        tick={{ fill: "hsl(var(--muted-foreground))" }} 
                        fontSize={12} 
                      />
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamentoAdmin)" name="Receita" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Revenue by Plan Chart */}
                <ChartCard title="Receita por Plano de Assinatura (Mês Atual)" isLoading={isLoading}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={revenueByPlanData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="totalRevenue"
                        nameKey="planName"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number, cy: number, midAngle: number, innerRadius: number, outerRadius: number, percent: number }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                                <text x={x} y={y} fill="hsl(var(--muted-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                            );
                        }}
                      >
                        {revenueByPlanData?.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Legend wrapperStyle={{fontSize: "12px", color: "hsl(var(--muted-foreground))"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Weekly Revenue Comparison Chart */}
                <ChartCard title="Receita Semanal: Mês Atual vs. Mês Anterior" isLoading={isLoading}>
                  <ResponsiveContainer>
                    <BarChart data={weeklyRevenueComparisonData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} />
                      <YAxis 
                        tickFormatter={(value: number) => `R$${(value / 1000).toFixed(0)}k`} 
                        tick={{ fill: "hsl(var(--muted-foreground))" }} 
                        fontSize={12} 
                      />
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Legend wrapperStyle={{fontSize: "12px", color: "hsl(var(--muted-foreground))"}}/>
                      <Bar dataKey="Mês Anterior" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Mês Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Lost Subscribers By Plan Chart */}
                <ChartCard title="Assinantes Perdidos por Plano (Mês Atual)" isLoading={isLoading} className="lg:col-span-2">
                  <ResponsiveContainer>
                    <BarChart data={churnByPlanData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="planName" tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} />
                      <YAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} />
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Legend wrapperStyle={{fontSize: "12px", color: "hsl(var(--muted-foreground))"}}/>
                      <Bar dataKey="lostCount" name="Assinantes perdidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20}>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Monthly Revenue History Chart */}
                <ChartCard title="Evolução da Receita Mensal da Plataforma" isLoading={isLoading} className="lg:col-span-2">
                  <ResponsiveContainer>
                    <AreaChart data={monthlyRevenueHistoryData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorMonthlyRevenueAdmin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={(value: number) => `R$${(value / 1000).toFixed(0)}k`}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorMonthlyRevenueAdmin)" name="Receita" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}