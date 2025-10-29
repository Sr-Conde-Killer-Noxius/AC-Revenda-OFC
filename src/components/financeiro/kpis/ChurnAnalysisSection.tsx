import { KpiCard } from "./KpiCard";
import { UserX, TrendingDown, Percent } from "lucide-react";
import { ChurnAnalysis } from "@/pages/financeiro/types";

interface ChurnAnalysisSectionProps {
  churnAnalysis: ChurnAnalysis | undefined;
  isLoading: boolean;
  formatCurrency: (value: number | undefined) => string;
  formatPercentage: (value: number | undefined) => string;
}

export const ChurnAnalysisSection: React.FC<ChurnAnalysisSectionProps> = ({ churnAnalysis, isLoading, formatCurrency, formatPercentage }) => (
  <div>
    <h3 className="text-xl font-semibold mb-4 mt-8 text-foreground">Análise de Churn (Perda de Clientes)</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <KpiCard 
        title="Clientes Perdidos no Mês" 
        value={churnAnalysis?.lostClientsThisMonth} 
        icon={UserX} 
        isLoading={isLoading}
      />
      <KpiCard 
        title="Receita Perdida (MRR)" 
        value={formatCurrency(churnAnalysis?.lostRevenueThisMonth)} 
        icon={TrendingDown} 
        isLoading={isLoading}
      />
      <KpiCard 
        title="Taxa de Churn Mensal" 
        value={formatPercentage(churnAnalysis?.churnRate)} 
        unit="%" 
        icon={Percent} 
        isLoading={isLoading}
      />
    </div>
  </div>
);