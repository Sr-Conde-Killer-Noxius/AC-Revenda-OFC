import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ArrowUpDown, RefreshCw, Bell, Check, ListChecks, CalendarCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { NotificationDialog } from "@/components/clients/NotificationDialog";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientStatus } from "@/integrations/supabase/schema"; // Importar ClientStatus do schema
import { Client, useClients, useDeleteClient, useRenewClient, useUpdateClientStatus, useSetClientDueToday } from "@/hooks/useClients"; // Corrigido: Importar Client do hook useClients
import { format } from "date-fns"; // Importar format para exibição
import { Card, CardContent } from "@/components/ui/card"; // Importar Card e CardContent
import { useAuth } from '@/contexts/AuthContext'; // Importar useAuth

type SortField = "name" | "due_date";
type SortOrder = "asc" | "desc";

export default function Clients() {
  const { role } = useAuth(); // Obter a função do usuário
  const { data: clients, isLoading, error } = useClients();
  const deleteClientMutation = useDeleteClient();
  const renewClientMutation = useRenewClient();
  const updateClientStatusMutation = useUpdateClientStatus();
  const setClientDueTodayMutation = useSetClientDueToday();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [clientToNotify, setClientToNotify] = useState<Client | null>(null);
  const [dueTodayDialogOpen, setDueTodayDialogOpen] = useState(false);
  const [clientToDueToday, setClientToDueToday] = useState<Client | null>(null);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar clientes", { description: "Não foi possível carregar a lista de clientes. Verifique sua conexão ou tente mais tarde." });
    }
  }, [error]);

  const filteredAndSortedClients = (clients || [])
    .filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      if (sortField === "name") {
        return multiplier * a.name.localeCompare(b.name);
      }
      return multiplier * (new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime());
    });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      active: { label: "Em dia", variant: "default" },
      inactive: { label: "Cancelado", variant: "secondary" },
      overdue: { label: "Atrasado", variant: "destructive" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleRenewClient = async (client: Client) => {
    if (!client.plan_id) {
      toast.error("Erro ao renovar cliente", { description: "Cliente não possui plano associado." });
      return;
    }

    try {
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("period_days")
        .eq("id", client.plan_id)
        .single();

      if (planError) throw planError;
      if (!planData) throw new Error("Plano associado não encontrado.");

      await renewClientMutation.mutateAsync({
        clientId: client.id,
        planPeriodDays: planData.period_days,
        currentNextBillingDate: client.next_billing_date,
        clientName: client.name,
        clientValue: client.value,
      });

      toast.success("Cliente renovado!", { description: `O cliente ${client.name} foi renovado com sucesso.` });
    } catch (error: any) {
      toast.error("Erro ao renovar cliente", { description: "Não foi possível renovar o cliente. Tente novamente." });
    }
  };

  const handleChangeStatus = async (client: Client, newStatus: ClientStatus) => {
    try {
      await updateClientStatusMutation.mutateAsync({
        clientId: client.id,
        newStatus,
        clientName: client.name,
        planId: client.plan_id || '', // Garante que planId não é nulo
        planName: client.planDetailsValue ? `Plano de R$${client.planDetailsValue.toFixed(2)}` : 'Plano Desconhecido', // Placeholder ou buscar nome do plano
        clientValue: client.value,
      });

      toast.success("Status atualizado!", { description: "O status do cliente foi alterado com sucesso." });
    } catch (error: any) {
      toast.error("Erro ao mudar status", { description: "Não foi possível alterar o status do cliente. Tente novamente." });
    }
  };

  const handleDueToday = (client: Client) => {
    setClientToDueToday(client);
    setDueTodayDialogOpen(true);
  };

  const handleConfirmDueToday = async () => {
    if (!clientToDueToday) return;

    try {
      await setClientDueTodayMutation.mutateAsync({
        clientId: clientToDueToday.id,
        clientName: clientToDueToday.name,
        currentStatus: clientToDueToday.status as ClientStatus,
      });

      toast.success("Vencimento alterado!", { description: `O vencimento de ${clientToDueToday.name} foi definido para hoje.` });
    } catch (error: any) {
      toast.error("Erro ao alterar vencimento", { description: "Não foi possível alterar a data de vencimento. Tente novamente." });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    try {
      await deleteClientMutation.mutateAsync(clientToDelete.id);
      toast.success("Cliente excluído", { description: "O cliente foi removido com sucesso." });
    } catch (error: any) {
      toast.error("Erro ao excluir cliente", { description: "Não foi possível excluir o cliente. Tente novamente." });
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleOpenDialog = (client?: Client) => {
    setSelectedClient(client || null);
    setDialogOpen(true);
  };

  const handleOpenNotificationDialog = (client: Client) => {
    setClientToNotify(client);
    setNotificationDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie seus clientes e cobranças</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Em dia</SelectItem>
            <SelectItem value="overdue">Atrasado</SelectItem>
            <SelectItem value="inactive">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card className="border rounded-lg">
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Carregando...</p>
          </CardContent>
        </Card>
      ) : filteredAndSortedClients.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center text-sm">
              {searchTerm || statusFilter !== "all"
                ? "Nenhum cliente encontrado com os filtros aplicados."
                : "Nenhum cliente cadastrado. Adicione seu primeiro cliente!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("name")}
                    className="gap-2 hover:bg-transparent p-0 text-xs sm:text-sm"
                  >
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("due_date")}
                    className="gap-2 hover:bg-transparent p-0 text-xs sm:text-sm"
                  >
                    Próximo Vencimento
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Telefone</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Valor</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Status</TableHead>
                {role === 'admin' && <TableHead className="whitespace-nowrap text-xs sm:text-sm">Criado Por</TableHead>} {/* NOVA COLUNA CONDICIONAL */}
                <TableHead className="w-[50px] text-xs sm:text-sm"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{client.name}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {(() => {
                      if (!client.next_billing_date) return '-';
                      
                      // A data vem como 'YYYY-MM-DD' do Supabase
                      const dateString = client.next_billing_date;

                      // Divide a string e cria um objeto Date local para evitar interpretação UTC
                      const parts = dateString.split('-').map(Number);
                      // Mês é 0-indexado no construtor de Date
                      const localDate = new Date(parts[0], parts[1] - 1, parts[2]);

                      // Formata o objeto Date local para exibição
                      return format(localDate, 'dd/MM/yyyy');
                    })()}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">{client.phone}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {client.planDetailsValue !== undefined && client.planDetailsValue !== null
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(client.planDetailsValue)
                      : "N/A"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">{getStatusBadge(client.status)}</TableCell>
                  {role === 'admin' && ( // CÉLULA CONDICIONAL
                    <TableCell className="text-xs sm:text-sm">
                      {client.creatorName || 'Desconhecido'}
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
                        <DropdownMenuItem onClick={() => handleOpenDialog(client)} className="text-sm">
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRenewClient(client)} className="text-sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Renovar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenNotificationDialog(client)} className="text-sm">
                          <Bell className="h-4 w-4 mr-2" />
                          Notificar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDueToday(client)} className="text-sm">
                          <CalendarCheck className="h-4 w-4 mr-2" />
                          Vencer Hoje
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-sm">
                            <ListChecks className="h-4 w-4 mr-2" />
                            Mudar Status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleChangeStatus(client, "active")} className="text-sm">
                              {client.status === "active" && <Check className="h-4 w-4 mr-2" />}
                              Ativo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeStatus(client, "inactive")} className="text-sm">
                              {client.status === "inactive" && <Check className="h-4 w-4 mr-2" />}
                              Inativo
                            </DropdownMenuItem>
                            {/* A opção 'Vencido' foi removida daqui */}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem
                          onClick={() => {
                            setClientToDelete(client);
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

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={selectedClient}
      />

      <NotificationDialog
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}
        client={clientToNotify}
      />

      <AlertDialog open={dueTodayDialogOpen} onOpenChange={setDueTodayDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Confirmar Vencimento para Hoje</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja alterar o vencimento do cliente "{clientToDueToday?.name}" para hoje?
              Se o cliente estiver inativo, ele será ativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDueToday} className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"? Esta ação não pode ser desfeita.
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