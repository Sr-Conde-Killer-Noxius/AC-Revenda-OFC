import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from "recharts";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "../CustomTooltip";
import { ChurnByPlan } from "@/pages/financeiro/types";

interface LostClientsByPlanChartProps {
  data: ChurnByPlan[] | undefined;
  isLoading: boolean;
}

export const LostClientsByPlanChart: React.FC<LostClientsByPlanChartProps> = ({ data, isLoading }) => (
  <ChartCard title="Clientes Perdidos por Plano (Mês Atual)" isLoading={isLoading} className="lg:col-span-2">
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="planName" tick={{ fill: "hsl(var(--muted-foreground))" }} className="text-xs" />
        <YAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} className="text-xs" />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Legend wrapperStyle={{fontSize: "0.75rem", color: "hsl(var(--muted-foreground))"}}/>
        <Bar dataKey="lostCount" name="Clientes perdidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20}>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);