import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, CalendarDays, Wallet, TrendingDown } from "lucide-react";

interface FinancialSummary {
  receivedToday: number;
  receivedThisWeek: number;
  receivedThisMonth: number;
  receivableToday: number;
  receivableTomorrow: number;
  receivableThisWeek: number;
  receivableThisMonth: number;
  lostValueToday: number;
  lostValueThisWeek: number;
  lostValueThisMonth: number;
}

const fetchFinancialSummary = async (): Promise<FinancialSummary> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
  const EDGE_FUNCTION_NAME = "financial-summary";
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
    throw new Error(errorData.error || "Erro ao buscar resumo financeiro.");
  }

  return response.json();
};

export default function Relatorios() {
  const queryOptions: UseQueryOptions<FinancialSummary, Error, FinancialSummary, ["financialSummary"]> = {
    queryKey: ["financialSummary"],
    queryFn: fetchFinancialSummary,
    staleTime: 1000 * 60 * 5,
  };

  const { data: summary, isLoading, error } = useQuery(queryOptions);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar relatórios", { description: "Não foi possível carregar os relatórios financeiros. Tente novamente mais tarde." });
    }
  }, [error]);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const renderCard = (title: string, value: number | undefined, icon: React.ElementType, valueColorClass: string = "text-foreground") => (
    <Card className="border-border bg-card hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && React.createElement(icon, { className: `h-4 w-4 ${valueColorClass.includes('destructive') ? 'text-destructive' : 'text-primary'}` })}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className={`text-3xl font-bold ${valueColorClass}`}>{formatCurrency(value)}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios Financeiros</h1>
        <p className="text-muted-foreground mt-1">Visualize seus relatórios financeiros.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Valores Recebidos</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderCard("Recebido Hoje", summary?.receivedToday, DollarSign)}
          {renderCard("Recebido nesta Semana", summary?.receivedThisWeek, TrendingUp)}
          {renderCard("Recebido neste Mês", summary?.receivedThisMonth, CalendarDays)}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Previsão de Recebíveis</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {renderCard("A Receber Hoje", summary?.receivableToday, DollarSign)}
          {renderCard("A Receber Amanhã", summary?.receivableTomorrow, CalendarDays)}
          {renderCard("A Receber nesta Semana", summary?.receivableThisWeek, Wallet)}
          {renderCard("A Receber neste Mês", summary?.receivableThisMonth, CalendarDays)}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Valores Perdidos (Churn)</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderCard("Perdido Hoje", summary?.lostValueToday, TrendingDown, "text-destructive")}
          {renderCard("Perdido nesta Semana", summary?.lostValueThisWeek, TrendingDown, "text-destructive")}
          {renderCard("Perdido neste Mês", summary?.lostValueThisMonth, TrendingDown, "text-destructive")}
        </div>
      </section>

      {error && (
        <Card className="border-destructive bg-destructive/10 text-destructive">
          <CardContent className="p-4">
            <p>Ocorreu um erro ao carregar os relatórios: Não foi possível carregar os relatórios financeiros. Tente novamente mais tarde.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}