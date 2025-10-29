import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "../CustomTooltip";
import { RevenueByPlan } from "@/pages/financeiro/types";

interface RevenueByPlanChartProps {
  data: RevenueByPlan[] | undefined;
  isLoading: boolean;
  formatCurrency: (value: number | undefined) => string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(250 70% 60%)", // Purple
  "hsl(40 90% 60%)",  // Orange
  "hsl(180 70% 60%)", // Cyan
];

export const RevenueByPlanChart: React.FC<RevenueByPlanChartProps> = ({ data, isLoading, formatCurrency: _formatCurrency }) => {
  // const __totalRevenueForDonut = data?.reduce((sum, entry) => sum + entry.totalRevenue, 0) || 0; // Removed as it was unused

  return (
    <ChartCard title="Faturamento por Plano (Mês Atual)" isLoading={isLoading}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
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
                    <text x={x} y={y} fill="hsl(var(--muted-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                        {`${(percent * 100).toFixed(0)}%`}
                    </text>
                );
            }}
          >
            {data?.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Legend wrapperStyle={{fontSize: "0.75rem", color: "hsl(var(--muted-foreground))"}}/>
        </PieChart>
      </ResponsiveContainer>
      {/* O bloco de código abaixo foi removido para eliminar o texto 'Total' flutuante */}
      {/* {!isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalRevenueForDonut)}</p>
        </div>
      )} */}
    </ChartCard>
  );
};