import React from "react";
import { DollarSign, Users, TrendingUp, Target, Wallet } from "lucide-react"; // Importar Wallet
import { Kpis } from "@/pages/financeiro/types";
import { KpiCard } from "./KpiCard"; // Import KpiCard from its own file

interface KpiSectionProps {
  kpis: Kpis | undefined;
  isLoading: boolean;
  formatCurrency: (value: number | undefined) => string;
  formatPercentage: (value: number | undefined) => string;
}

export const KpiSection: React.FC<KpiSectionProps> = ({ kpis, isLoading, formatCurrency, formatPercentage }) => (
  <div>
    <h3 className="text-xl font-semibold mb-4 text-foreground">Indicadores Chave</h3>
    <div className="space-y-6"> {/* Container para as duas linhas de cartões */}
      {/* Primeira linha: Faturamento no Mês, Previsão de Faturamento, Crescimento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard 
          title="Faturamento no Mês" 
          value={formatCurrency(kpis?.currentMonthRevenue)} 
          icon={DollarSign} 
          isLoading={isLoading}
        />
        <KpiCard 
          title="Previsão de Faturamento" 
          value={formatCurrency(kpis?.revenueForecast)} 
          icon={Wallet} 
          isLoading={isLoading}
        />
        <KpiCard 
          title="Crescimento" 
          value={formatPercentage(kpis?.monthlyGrowthPercentage)} 
          unit="%" 
          icon={TrendingUp} 
          growth={kpis?.monthlyGrowthPercentage} 
          isLoading={isLoading}
        />
      </div>

      {/* Segunda linha: Novos Clientes no Mês, Total de Clientes Ativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        <KpiCard 
          title="Novos Clientes no Mês" 
          value={kpis?.newClientsThisMonth} 
          icon={Users} 
          isLoading={isLoading}
        />
        <KpiCard 
          title="Total de Clientes Ativos" 
          value={kpis?.activeClients} 
          icon={Target} 
          isLoading={isLoading}
        />
      </div>
    </div>
  </div>
);