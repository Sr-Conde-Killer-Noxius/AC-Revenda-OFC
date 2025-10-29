import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats();

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar estatísticas", { description: "Não foi possível carregar as estatísticas do dashboard. Tente novamente mais tarde." });
    }
  }, [error]);

  const statCards = [
    {
      title: "Total de Clientes",
      value: stats?.totalClients || 0,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Clientes Ativos",
      value: stats?.activeClients || 0,
      icon: TrendingUp,
      color: "text-success",
    },
    {
      title: "Planos Cadastrados",
      value: stats?.totalPlans || 0,
      icon: FileText,
      color: "text-accent",
    },
    {
      title: "Cobranças Atrasadas",
      value: stats?.overdueClients || 0,
      icon: AlertCircle,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Visão geral do seu sistema de cobrança
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className="border-border bg-card hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Bem-vindo ao Acerto Certo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Gerencie seus clientes, planos e cobranças de forma eficiente. Use o menu lateral
            para navegar entre as diferentes funcionalidades do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}