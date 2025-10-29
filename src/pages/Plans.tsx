import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlanDialog } from "@/components/plans/PlanDialog";
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
import { usePlans, useDeletePlan, Plan } from "@/hooks/usePlans"; // Importar Plan do hook usePlans
import { Card, CardContent } from "@/components/ui/card"; // Importar Card e CardContent
import { useAuth } from '@/contexts/AuthContext'; // Importar useAuth

export default function Plans() {
  const { role } = useAuth(); // Obter a função do usuário
  const { data: plans, isLoading, error } = usePlans();
  const deletePlanMutation = useDeletePlan();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar planos", { description: "Não foi possível carregar os planos. Verifique sua conexão ou tente mais tarde." });
    }
  }, [error]);

  const handleOpenDialog = (plan?: Plan) => {
    setSelectedPlan(plan || null);
    setDialogOpen(true);
  };

  const getPeriodLabel = (days: number) => {
    if (days === 1) return "Diário";
    if (days === 7) return "Semanal";
    if (days === 30) return "Mensal";
    return `${days} dias`;
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    try {
      await deletePlanMutation.mutateAsync(planToDelete.id);
      toast.success("Plano excluído", { description: "O plano foi removido com sucesso." });
    } catch (error: any) {
      toast.error("Erro ao excluir plano", { description: "Não foi possível excluir o plano. Tente novamente." });
    } finally {
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Planos</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie seus planos de cobrança</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {isLoading ? (
        <Card className="border rounded-lg">
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Carregando...</p>
          </CardContent>
        </Card>
      ) : (plans || []).length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center text-sm">
              Nenhum plano cadastrado. Crie seu primeiro plano!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Nome do Plano</TableHead>
                <TableHead className="text-xs sm:text-sm">Valor</TableHead>
                <TableHead className="text-xs sm:text-sm">Período</TableHead>
                {role === 'admin' && <TableHead className="text-xs sm:text-sm">Criado Por</TableHead>} {/* Nova coluna condicional */}
                <TableHead className="w-[50px] text-xs sm:text-sm"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(plans || []).map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{plan.name}</TableCell>
                  <TableCell className="text-xs sm:text-sm">R$ {Number(plan.value).toFixed(2)}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{getPeriodLabel(plan.period_days)}</TableCell>
                  {role === 'admin' && ( // Célula condicional
                    <TableCell className="text-xs sm:text-sm">
                      {plan.creatorName || 'Você (Admin)'}
                    </TableCell>
                  )}
                  <TableCell className="text-xs sm:text-sm">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(plan)} className="text-sm">
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setPlanToDelete(plan);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive text-sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={selectedPlan}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir o plano "{planToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}