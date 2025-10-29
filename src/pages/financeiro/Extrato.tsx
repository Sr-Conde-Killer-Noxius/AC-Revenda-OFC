import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FinancialEntry, TransactionType } from "@/integrations/supabase/schema";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EditFinancialEntryDialog } from "@/components/financeiro/EditFinancialEntryDialog";
import { useFinancialEntries, useDeleteFinancialEntry } from "@/hooks/useFinancialEntries";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { useAdminFinancialEntriesWithCreator, AdminFinancialEntryWithCreator } from '@/hooks/useAdminFinancialEntriesWithCreator'; // NOVO: Importar o novo hook

export default function Extrato() {
  const { role } = useAuth(); // Obter a função do usuário

  // Chamadas condicionais dos hooks de dados
  const { data: userEntries, isLoading: isLoadingUserEntries, error: userError } = useFinancialEntries();
  const { data: adminEntries, isLoading: isLoadingAdminEntries, error: adminError } = useAdminFinancialEntriesWithCreator();

  // Determinar quais dados, estado de carregamento e erro usar com base na função do usuário
  const currentEntries = role === 'admin' ? adminEntries : userEntries;
  const currentIsLoading = role === 'admin' ? isLoadingAdminEntries : isLoadingUserEntries;
  const currentError = role === 'admin' ? adminError : userError;

  const deleteFinancialEntryMutation = useDeleteFinancialEntry();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<FinancialEntry | null>(null);

  useEffect(() => {
    if (currentError) { // Usar currentError
      toast.error("Erro ao carregar extrato", { description: "Não foi possível carregar o extrato financeiro. Tente novamente mais tarde." });
    }
  }, [currentError]); // Depender de currentError

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getTypeBadge = (type: TransactionType) => {
    if (type === "credit") {
      return <Badge variant="default" className="bg-success hover:bg-success/80">Entrada</Badge>;
    }
    return <Badge variant="destructive">Saída</Badge>;
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;

    try {
      await deleteFinancialEntryMutation.mutateAsync(entryToDelete.id);
      toast.success("Lançamento excluído", { description: "O lançamento foi removido com sucesso." });
    } catch (error: any) {
      toast.error("Erro ao excluir lançamento", { description: "Não foi possível excluir o lançamento financeiro. Tente novamente." });
    } finally {
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleOpenEditDialog = (entry: FinancialEntry) => {
    setEntryToEdit(entry);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Extrato Financeiro</h1>
        <p className="text-muted-foreground mt-1">Visualize todas as suas transações financeiras.</p>
      </div>

      {currentIsLoading ? ( // Usar currentIsLoading
        <Card className="border-border bg-card">
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando extrato...</p>
          </CardContent>
        </Card>
      ) : (currentEntries || []).length === 0 ? ( // Usar currentEntries
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              Nenhuma transação registrada ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Data</TableHead>
                <TableHead className="whitespace-nowrap">Descrição</TableHead>
                <TableHead className="whitespace-nowrap">Valor</TableHead>
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                {role === 'admin' && <TableHead className="whitespace-nowrap">Usuário</TableHead>} {/* NOVO: Coluna Usuário condicional */}
                <TableHead className="w-[50px] whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(currentEntries || []).map((entry) => ( // Usar currentEntries
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(entry.created_at!).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{entry.description}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(entry.value)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{getTypeBadge(entry.type)}</TableCell>
                  {role === 'admin' && ( // NOVO: Célula Usuário condicional
                    <TableCell className="whitespace-nowrap">
                      {/* Acessa creatorName do tipo AdminFinancialEntryWithCreator */}
                      {(entry as AdminFinancialEntryWithCreator).creatorName || 'Você (Admin)'}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEditDialog(entry)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEntryToDelete(entry);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
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

      <EditFinancialEntryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        entry={entryToEdit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lançamento "{entryToDelete?.description}"? Esta ação não pode ser desfeita.
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