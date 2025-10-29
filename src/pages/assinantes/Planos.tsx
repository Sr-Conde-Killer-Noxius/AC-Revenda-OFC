import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SubscriberPlan } from "@/integrations/supabase/schema"; // Importar SubscriberPlan do schema
import { useSubscriberPlans, useDeleteSubscriberPlan } from "@/hooks/useSubscriberManagement"; // Usar hooks de subscriber plans
import { SubscriberPlanDialog } from "@/components/admin/assinantes/SubscriberPlanDialog"; // Novo componente de diálogo
import { Card, CardContent } from "@/components/ui/card"; // Import Card and CardContent
import { cn } from "@/lib/utils"; // Importar cn para mesclar classes

export default function AdminPlanos() {
  const { data: plans, isLoading, error } = useSubscriberPlans();
  const deletePlanMutation = useDeleteSubscriberPlan();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriberPlan | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriberPlan | null>(null);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar planos de assinantes", { description: "Não foi possível carregar os planos de assinantes. Tente novamente mais tarde." });
    }
  }, [error]);

  const getPeriodLabel = (days: number) => {
    if (days === 1) return "Diário";
    if (days === 7) return "Semanal";
    if (days === 30) return "Mensal";
    return `${days} dias`;
  };

  const handleOpenDialog = (plan?: SubscriberPlan) => {
    setSelectedPlan(plan || null);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    try {
      await deletePlanMutation.mutateAsync(planToDelete.id);
      toast.success("Plano de assinante excluído", { description: "O plano foi removido com sucesso." });
    } catch (error: any) {
      toast.error("Erro ao excluir plano de assinante", { description: "Não foi possível excluir o plano de assinante. Tente novamente." });
    } finally {
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Planos de Assinantes</h1>
          <p className="text-muted-foreground mt-1">Gerencie os planos de assinatura da plataforma</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {isLoading ? (
        <Card className="border rounded-lg">
          <CardContent className="h-48 sm:h-64 flex items-center justify-center"> {/* Adicionado h-48 sm:h-64 */}
            <p className="text-muted-foreground">Carregando planos...</p>
          </CardContent>
        </Card>
      ) : (plans || []).length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              Nenhum plano de assinante cadastrado. Crie seu primeiro plano!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto"> {/* Adicionado overflow-x-auto */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Período (dias)</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(plans || []).map((plan) => {
                const isInitialPlan = plan.name === 'Plano Inicial';
                return (
                  <TableRow 
                    key={plan.id} 
                    className={cn(
                      isInitialPlan && "bg-primary/10 border-primary/50 hover:bg-primary/20",
                      "hover:bg-muted/20 transition-colors"
                    )}
                  >
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>R$ {Number(plan.value).toFixed(2)}</TableCell>
                    <TableCell>{getPeriodLabel(plan.period_days)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(plan)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPlanToDelete(plan);
                              setDeleteDialogOpen(true);
                            }}
                            className={cn("text-destructive", isInitialPlan && "opacity-50 cursor-not-allowed")}
                            disabled={isInitialPlan}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <SubscriberPlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={selectedPlan}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano de assinante "{planToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}