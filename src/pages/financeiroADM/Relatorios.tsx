import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, CalendarDays, Wallet, TrendingDown } from "lucide-react";
import { useAdminFinancialSummary } from "@/hooks/useAdminFinancialData"; // Usar o hook admin

export default function AdminRelatorios() {
  const { data: summary, isLoading, error } = useAdminFinancialSummary();

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar relatórios administrativos", { description: "Não foi possível carregar os relatórios administrativos. Tente novamente mais tarde." });
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
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios Financeiros Admin</h1>
        <p className="text-muted-foreground mt-1">Visualize os relatórios financeiros da plataforma.</p>
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
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Valores Perdidos (Churn de Assinantes)</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderCard("Perdido Hoje", summary?.lostValueToday, TrendingDown, "text-destructive")}
          {renderCard("Perdido nesta Semana", summary?.lostValueThisWeek, TrendingDown, "text-destructive")}
          {renderCard("Perdido neste Mês", summary?.lostValueThisMonth, TrendingDown, "text-destructive")}
        </div>
      </section>

      {error && (
        <Card className="border-destructive bg-destructive/10 text-destructive">
          <CardContent className="p-4">
            <p>Ocorreu um erro ao carregar os relatórios: Não foi possível carregar os relatórios administrativos. Tente novamente mais tarde.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}