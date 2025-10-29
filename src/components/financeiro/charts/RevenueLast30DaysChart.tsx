import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "../CustomTooltip";
import { RevenueData } from "@/pages/financeiro/types";

interface RevenueLast30DaysChartProps {
  data: RevenueData[] | undefined;
  isLoading: boolean;
}

export const RevenueLast30DaysChart: React.FC<RevenueLast30DaysChartProps> = ({ data, isLoading }) => (
  <ChartCard title="Faturamento nos Últimos 30 Dias" isLoading={isLoading} className="lg:col-span-2">
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: "hsl(var(--muted-foreground))" }} 
          className="text-xs" 
          tickFormatter={(dateStr: string) => new Date(dateStr).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
        />
        <YAxis 
          tickFormatter={(value: number) => `R$${(value / 1000).toFixed(0)}k`} 
          tick={{ fill: "hsl(var(--muted-foreground))" }} 
          className="text-xs" 
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamento)" name="Faturamento" />
      </AreaChart>
    </ResponsiveContainer>
  </ChartCard>
);