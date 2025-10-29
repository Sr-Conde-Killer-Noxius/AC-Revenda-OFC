import { useEffect } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingState } from "@/components/financeiro/LoadingState";
import { ErrorState } from "@/components/financeiro/ErrorState";
import { KpiSection } from "@/components/financeiro/kpis/KpiSection";
import { ChurnAnalysisSection } from "@/components/financeiro/kpis/ChurnAnalysisSection";
import { RevenueLast30DaysChart } from "@/components/financeiro/charts/RevenueLast30DaysChart";
import { RevenueByPlanChart } from "@/components/financeiro/charts/RevenueByPlanChart";
import { WeeklyRevenueComparisonChart } from "@/components/financeiro/charts/WeeklyRevenueComparisonChart";
import { LostClientsByPlanChart } from "@/components/financeiro/charts/LostClientsByPlanChart";
import { MonthlyRevenueHistoryChart } from "@/components/financeiro/charts/MonthlyRevenueHistoryChart";
import { FinancialAnalysis } from "./types";

const fetchFinancialAnalysis = async (): Promise<FinancialAnalysis> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
  const EDGE_FUNCTION_NAME = "financial-analysis";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar dados de análise financeira.");
  }

  return response.json();
};

export default function Analise() {
  const queryOptions: UseQueryOptions<FinancialAnalysis, Error, FinancialAnalysis, ["financialAnalysis"]> = {
    queryKey: ["financialAnalysis"],
    queryFn: fetchFinancialAnalysis,
    staleTime: 1000 * 60 * 5,
  };

  const { data: analysis, isLoading, error } = useQuery(queryOptions);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar análise financeira", { description: "Não foi possível carregar a análise financeira. Tente novamente mais tarde." });
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

  return (
    <div className="bg-background min-h-screen text-foreground p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Análise Financeira</h1>
          <p className="text-muted-foreground mt-1">Visão aprofundada da saúde financeira do seu negócio.</p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          <KpiSection
            kpis={analysis?.kpis}
            isLoading={isLoading}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />

          <ChurnAnalysisSection
            churnAnalysis={analysis?.churnAnalysis}
            isLoading={isLoading}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />

          <div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-4 mt-8 text-foreground">Gráficos de Desempenho</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueLast30DaysChart data={analysis?.revenueLast30Days} isLoading={isLoading} />

                <RevenueByPlanChart
                  data={analysis?.revenueByPlan}
                  isLoading={isLoading}
                  formatCurrency={formatCurrency}
                />

                <WeeklyRevenueComparisonChart
                  data={analysis?.weeklyRevenueComparison}
                  isLoading={isLoading}
                />

                <LostClientsByPlanChart data={analysis?.churnAnalysis?.churnByPlan} isLoading={isLoading} />

                <MonthlyRevenueHistoryChart data={analysis?.monthlyRevenueHistory} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}