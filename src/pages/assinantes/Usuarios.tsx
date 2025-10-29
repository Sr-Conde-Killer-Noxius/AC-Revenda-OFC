import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, UserCog, DollarSign, Check, Trash2, RefreshCw, CalendarCheck, Bell, Wifi } from 'lucide-react';
import { toast } from 'sonner';
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
import { Enums } from '@/integrations/supabase/schema';
import { useAllUsers, useUpdateUserRole, UserWithDetails, useDeleteUser, useRenewSubscriber, useSetSubscriberDueToday, useUpdateUserInstanceStatus } from '@/hooks/useSubscriberManagement';
import { useSubscriberPlans } from '@/hooks/useSubscriberManagement';
import { format } from 'date-fns';
import { UpdateSubscriberSubscriptionDialog } from '@/components/admin/assinantes/UpdateSubscriberSubscriptionDialog';
import { SubscriberNotificationDialog } from '@/components/admin/assinantes/SubscriberNotificationDialog';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminUsuarios() {
  const { user: currentUser, role: currentUserRole } = useAuth();
  const { data: users, isLoading, error } = useAllUsers();
  const { data: subscriberPlans, isLoading: isLoadingSubscriberPlans, error: subscriberPlansError } = useSubscriberPlans();
  const updateUserRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();
  const renewSubscriberMutation = useRenewSubscriber();
  const setSubscriberDueTodayMutation = useSetSubscriberDueToday();
  const updateInstanceStatusMutation = useUpdateUserInstanceStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithDetails | null>(null);

  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [userToRenew, setUserToRenew] = useState<UserWithDetails | null>(null);

  const [dueTodayDialogOpen, setDueTodayDialogOpen] = useState(false);
  const [userToDueToday, setUserToDueToday] = useState<UserWithDetails | null>(null);

  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [userToNotify, setUserToNotify] = useState<UserWithDetails | null>(null);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar usuários", { description: error.message });
    }
    if (subscriberPlansError) {
      toast.error("Erro ao carregar planos de assinantes", { description: subscriberPlansError.message });
    }
  }, [error, subscriberPlansError]);

  const getSubscriptionDisplayStatus = (subscription: UserWithDetails['subscription']): { label: string; variant: 'default' | 'destructive' | 'secondary' } => {
    if (!subscription) {
      return { label: 'Sem Assinatura', variant: 'secondary' };
    }

    // Priorize o status explícito do banco de dados
    if (subscription.status === 'overdue') {
      return { label: 'Vencida', variant: 'destructive' };
    }
    if (subscription.status === 'inactive') {
      return { label: 'Inativa', variant: 'secondary' };
    }

    // Se o status for 'active' (ou implicitamente ativo), então considere se é um plano gratuito
    if (subscription.isFree) {
      return { label: 'Ativa (Grátis)', variant: 'default' };
    }

    // Para planos pagos ativos, verifique a data de vencimento para clareza de exibição,
    // embora o status do DB já deva ser 'active'
    if (subscription.next_billing_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextBillingDate = new Date(subscription.next_billing_date + 'T00:00:00');
      nextBillingDate.setHours(0, 0, 0, 0);

      if (today > nextBillingDate) {
        // Este caso deve ser coberto por subscription.status === 'overdue'
        // mas como um fallback para exibição, podemos mostrá-lo como vencido se a data passou.
        return { label: 'Vencida', variant: 'destructive' };
      }
    }
    
    // Padrão para ativo se nenhuma das condições acima for atendida
    return { label: 'Ativa', variant: 'default' };
  };

  const filteredUsers = (users || [])
    .filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.phone && user.phone.includes(searchTerm)) ||
        user.id.includes(searchTerm);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      const displayStatus = getSubscriptionDisplayStatus(user.subscription).label;
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && displayStatus.includes('Ativa')) ||
                            (statusFilter === 'inactive' && displayStatus === 'Inativa') ||
                            (statusFilter === 'overdue' && displayStatus === 'Vencida');

      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getRoleBadge = (role: Enums<'app_role'>) => {
    return (
      <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
        {role === 'admin' ? 'Admin' : 'Usuário'}
      </Badge>
    );
  };

  const getInstanceStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-success hover:bg-success/80">Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Desconectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Aguardando QR</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Enums<'app_role'>) => {
    try {
      await updateUserRoleMutation.mutateAsync({ targetUserId: userId, newRole });
    } catch (err: any) {
      toast.error("Erro ao atualizar função", { description: err.message });
    }
  };

  const handleChangeInstanceStatus = async (instanceId: string, newStatus: string) => {
    try {
      await updateInstanceStatusMutation.mutateAsync({ instanceId, newStatus });
    } catch (err: any) {
      toast.error("Erro ao atualizar status da instância", { description: err.message });
    }
  };

  const handleOpenSubscriptionDialog = (user: UserWithDetails) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleOpenNotificationDialog = (user: UserWithDetails) => {
    setUserToNotify(user);
    setNotificationDialogOpen(true);
  };

  const handleRenewSubscriber = (user: UserWithDetails) => {
    if (!user.subscription) {
      toast.error("Erro ao renovar", { description: "Assinante não possui assinatura ativa." });
      return;
    }
    setUserToRenew(user);
    setRenewDialogOpen(true);
  };

  const handleConfirmRenew = async () => {
    if (!userToRenew || !userToRenew.subscription) return;

    try {
      await renewSubscriberMutation.mutateAsync({
        subscriptionId: userToRenew.subscription.id,
        targetUserId: userToRenew.id,
        planName: userToRenew.subscription.plan_name,
        currentNextBillingDate: userToRenew.subscription.next_billing_date!,
        price: userToRenew.subscription.price,
      });
      toast.success("Assinatura renovada!", { description: `A assinatura de ${userToRenew.name} foi renovada com sucesso.` });
    } catch (err: any) {
      toast.error("Erro ao renovar assinatura", { description: err.message });
    } finally {
      setRenewDialogOpen(false);
      setUserToRenew(null);
    }
  };

  const handleSetDueToday = (user: UserWithDetails) => {
    if (!user.subscription) {
      toast.error("Erro ao definir vencimento", { description: "Assinante não possui assinatura ativa." });
      return;
    }
    setUserToDueToday(user);
    setDueTodayDialogOpen(true);
  };

  const handleConfirmDueToday = async () => {
    if (!userToDueToday || !userToDueToday.subscription) return;

    try {
      await setSubscriberDueTodayMutation.mutateAsync({
        subscriptionId: userToDueToday.subscription.id,
        targetUserId: userToDueToday.id,
        currentStatus: userToDueToday.subscription.status,
        price: userToDueToday.subscription.price,
      });
      toast.success("Vencimento alterado!", { description: `O vencimento de ${userToDueToday.name} foi definido para hoje.` });
    } catch (err: any) {
      toast.error("Erro ao alterar vencimento", { description: err.message });
    } finally {
      setDueTodayDialogOpen(false);
      setUserToDueToday(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
    } catch (err: any) {
      // Error already handled by the mutation's onError
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-1">Visualize e gerencie todos os usuários da plataforma.</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <div className="w-full sm:min-w-[150px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-sm">
                Função: {roleFilter === 'all' ? 'Todas' : roleFilter === 'admin' ? 'Admin' : 'Usuário'} <MoreHorizontal className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setRoleFilter('all')} className="text-sm">Todas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoleFilter('admin')} className="text-sm">Admin</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoleFilter('user')} className="text-sm">Usuário</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="w-full sm:min-w-[150px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-sm">
                Status Assinatura: {statusFilter === 'all' ? 'Todos' : statusFilter === 'active' ? 'Ativa' : statusFilter === 'inactive' ? 'Inativa' : 'Vencida'} <MoreHorizontal className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter('all')} className="text-sm">Todos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('active')} className="text-sm">Ativa</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('inactive')} className="text-sm">Inativa</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('overdue')} className="text-sm">Vencida</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading || isLoadingSubscriberPlans ? (
        <Card className="border-border bg-card">
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Carregando usuários...</p>
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center text-sm">
              Nenhum usuário encontrado com os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Nome</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">E-mail</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Telefone</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Função</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Assinatura</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Próximo Vencimento</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Status Assinatura</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Instância</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Status Conexão</TableHead>
                <TableHead className="w-[50px] text-xs sm:text-sm"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const subscriptionDisplayStatus = getSubscriptionDisplayStatus(user.subscription);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{user.name}</TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">{user.email}</TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">{user.phone || 'N/A'}</TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {user.role === 'admin' ? (
                        <span className="text-muted-foreground">N/A</span>
                      ) : user.subscription ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{user.subscription.plan_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.subscription.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sem Assinatura</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {user.role === 'admin' ? (
                        <span className="text-muted-foreground">N/A</span>
                      ) : user.subscription?.next_billing_date ? format(new Date(user.subscription.next_billing_date + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {user.role === 'admin' ? (
                        <span className="text-muted-foreground">N/A</span>
                      ) : (
                        <Badge variant={subscriptionDisplayStatus.variant}>{subscriptionDisplayStatus.label}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {user.instance ? (
                        <span className="font-medium">{user.instance.instance_name}</span>
                      ) : (
                        <span className="text-muted-foreground">Sem Instância</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {user.instance ? (
                        getInstanceStatusBadge(user.instance.status)
                      ) : (
                        <Badge variant="secondary">Sem Instância</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-sm">
                              <UserCog className="h-4 w-4 mr-2" />
                              Mudar Função
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleUpdateRole(user.id, 'admin')} className="text-sm">
                                {user.role === 'admin' && <Check className="h-4 w-4 mr-2" />}
                                Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRole(user.id, 'user')} className="text-sm">
                                {user.role === 'user' && <Check className="h-4 w-4 mr-2" />}
                                Usuário
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem
                            onClick={() => handleOpenSubscriptionDialog(user)}
                            disabled={user.role === 'admin'}
                            className="text-sm"
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Gerenciar Assinatura
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRenewSubscriber(user)}
                            disabled={user.role === 'admin' || !user.subscription || renewSubscriberMutation.isPending}
                            className="text-sm"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renovar Assinatura
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSetDueToday(user)}
                            disabled={user.role === 'admin' || !user.subscription || setSubscriberDueTodayMutation.isPending}
                            className="text-sm"
                          >
                            <CalendarCheck className="h-4 w-4 mr-2" />
                            Vencer Hoje
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenNotificationDialog(user)}
                            disabled={user.role === 'admin' || !user.phone}
                            className="text-sm"
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            Notificar
                          </DropdownMenuItem>
                          {currentUserRole === 'admin' && user.instance && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-sm">
                                <Wifi className="h-4 w-4 mr-2" />
                                Mudar Status Conexão
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleChangeInstanceStatus(user.instance!.id, 'connected')} className="text-sm">
                                  {user.instance.status === 'connected' && <Check className="h-4 w-4 mr-2" />}
                                  Conectado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeInstanceStatus(user.instance!.id, 'disconnected')} className="text-sm">
                                  {user.instance.status === 'disconnected' && <Check className="h-4 w-4 mr-2" />}
                                  Desconectado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeInstanceStatus(user.instance!.id, 'connecting')} className="text-sm">
                                  {user.instance.status === 'connecting' && <Check className="h-4 w-4 mr-2" />}
                                  Aguardando QR Code...
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive text-sm"
                            disabled={user.role === 'admin' || user.id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Usuário
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

      {selectedUser && (
        <UpdateSubscriberSubscriptionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={selectedUser}
          subscriberPlans={subscriberPlans}
          isLoadingSubscriberPlans={isLoadingSubscriberPlans}
        />
      )}

      {userToNotify && (
        <SubscriberNotificationDialog
          open={notificationDialogOpen}
          onOpenChange={setNotificationDialogOpen}
          subscriber={userToNotify}
        />
      )}

      <AlertDialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Renovação de Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja renovar a assinatura de "{userToRenew?.name}"?
              A data de vencimento será atualizada e uma entrada financeira será registrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRenew}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={renewSubscriberMutation.isPending}
            >
              {renewSubscriberMutation.isPending ? "Renovando..." : "Confirmar Renovação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dueTodayDialogOpen} onOpenChange={setDueTodayDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Vencimento para Hoje</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o vencimento da assinatura de "{userToDueToday?.name}" para hoje?
              Se a assinatura estiver inativa, ela será ativada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDueToday}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={setSubscriberDueTodayMutation.isPending}
            >
              {setSubscriberDueTodayMutation.isPending ? "Atualizando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{userToDelete?.name}" ({userToDelete?.email})?
              Esta ação é irreversível e removerá todos os dados associados a este usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir Usuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}