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
import { TransactionType } from "@/integrations/supabase/schema";
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
import { AdminFinancialEntry } from "@/integrations/supabase/schema"; // Importar AdminFinancialEntry
import { useAdminFinancialEntries, useDeleteAdminFinancialEntry } from "@/hooks/useAdminFinancialData";
import { toast } from "sonner";
import { AdminFinancialEntryDialog } from "@/components/admin/financeiro/AdminFinancialEntryDialog"; // Novo componente de diálogo

export default function AdminExtrato() {
  const { data: entries, isLoading, error } = useAdminFinancialEntries();
  const deleteFinancialEntryMutation = useDeleteAdminFinancialEntry();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<AdminFinancialEntry | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<AdminFinancialEntry | null>(null);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar extrato administrativo", { description: "Não foi possível carregar o extrato financeiro administrativo. Tente novamente mais tarde." });
    }
  }, [error]);

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
      toast.success("Lançamento excluído", { description: "O lançamento administrativo foi removido com sucesso." });
    } catch (error: any) {
      toast.error("Erro ao excluir lançamento", { description: "Não foi possível excluir o lançamento financeiro administrativo. Tente novamente." });
    } finally {
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleOpenEditDialog = (entry: AdminFinancialEntry) => {
    setEntryToEdit(entry);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Extrato Financeiro Admin</h1>
        <p className="text-muted-foreground mt-1">Visualize todas as transações financeiras da plataforma.</p>
      </div>

      {isLoading ? (
        <Card className="border-border bg-card">
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando extrato administrativo...</p>
          </CardContent>
        </Card>
      ) : (entries || []).length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              Nenhuma transação administrativa registrada ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Assinante ID</TableHead>
                <TableHead className="w-[50px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(entries || []).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {new Date(entry.created_at!).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className={entry.type === "credit" ? "text-success" : "text-destructive"}>
                    {formatCurrency(entry.value)}
                  </TableCell>
                  <TableCell>{getTypeBadge(entry.type)}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.subscriber_id}</TableCell>
                  <TableCell>
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

      <AdminFinancialEntryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        entry={entryToEdit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lançamento administrativo "{entryToDelete?.description}"? Esta ação não pode ser desfeita.
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