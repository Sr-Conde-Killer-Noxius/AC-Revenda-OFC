import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from "recharts";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "../CustomTooltip";
import { WeeklyRevenue } from "@/pages/financeiro/types";

interface WeeklyRevenueComparisonChartProps {
  data: WeeklyRevenue | undefined;
  isLoading: boolean;
}

export const WeeklyRevenueComparisonChart: React.FC<WeeklyRevenueComparisonChartProps> = ({ data, isLoading }) => {
  const weeklyChartData = data
    ? Object.keys(data).map((weekKey) => ({
        name: `Semana ${weekKey.replace('week', '')}`,
        "Mês Atual": data[weekKey].currentMonth,
        "Mês Anterior": data[weekKey].previousMonth,
      }))
    : [];

  return (
    <ChartCard title="Receita Semanal: Mês Atual vs. Mês Anterior" isLoading={isLoading}>
      <ResponsiveContainer>
        <BarChart data={weeklyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} className="text-xs" />
          <YAxis 
            tickFormatter={(value: number) => `R$${(value / 1000).toFixed(0)}k`} 
            tick={{ fill: "hsl(var(--muted-foreground))" }} 
            className="text-xs" 
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Legend wrapperStyle={{fontSize: "0.75rem", color: "hsl(var(--muted-foreground))"}}/>
          <Bar dataKey="Mês Anterior" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Mês Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};