import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import {
  useSubscriberAutomations,
  useCreateSubscriberAutomation,
  useUpdateSubscriberAutomation,
  useDeleteSubscriberAutomation,
  useSubscriberTemplates,
  useAllUsers,
  UserWithDetails,
  useScheduleSubscriberNotificationsForRule,
} from '@/hooks/useSubscriberManagement';
import { SubscriberAutomation } from '@/integrations/supabase/schema';
import { toast } from 'sonner';
import { PlusCircle as PlusCircleIcon, Search as SearchIcon, Trash2, Users } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminAutomacoes() {
  const { data: automations, isLoading: isLoadingAutomations, error: automationsError } = useSubscriberAutomations();
  const { data: templates, isLoading: isLoadingTemplates, error: templatesError } = useSubscriberTemplates();
  const { data: allUsers, isLoading: isLoadingAllUsers, error: allUsersError } = useAllUsers();

  const createAutomationMutation = useCreateSubscriberAutomation();
  const updateAutomationMutation = useUpdateSubscriberAutomation();
  const deleteAutomationMutation = useDeleteSubscriberAutomation();
  const scheduleNotificationsMutation = useScheduleSubscriberNotificationsForRule();

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<SubscriberAutomation | null>(null);
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  const [tempSubscriberSelections, setTempSubscriberSelections] = useState<Record<string, string[]>>({});
  const [searchTermSubscribers, setSearchTermSubscribers] = useState<Record<string, string>>({}); // Estado para busca de assinantes no popover

  useEffect(() => {
    if (automationsError) toast.error(`Erro ao carregar automações: ${automationsError.message}`);
    if (templatesError) toast.error(`Erro ao carregar templates: ${templatesError.message}`);
    if (allUsersError) toast.error(`Erro ao carregar assinantes: ${allUsersError.message}`);
  }, [automationsError, templatesError, allUsersError]);

  const handleAddAutomation = async () => {
    if (!templates || templates.length === 0) {
      toast.error("É necessário ter pelo menos um template cadastrado para criar uma automação.");
      return;
    }
    if (!allUsers || allUsers.length === 0) {
      toast.error("É necessário ter pelo menos um assinante cadastrado para criar uma automação.");
      return;
    }

    try {
      // Filtra apenas assinantes ativos para a automação inicial
      const activeSubscriberIds = allUsers.filter((u: UserWithDetails) => u.subscription?.status === 'active').map((u: UserWithDetails) => u.id);

      await createAutomationMutation.mutateAsync({
        days_offset: -1,
        subscriber_template_id: templates[0].id,
        subscriber_ids: activeSubscriberIds,
        scheduled_time: '09:00:00',
      });
    } catch (error) {
      // Erro já tratado no onSuccess/onError do hook
    }
  };

  const isLoadingPage = isLoadingAutomations || isLoadingTemplates || isLoadingAllUsers;

  const handleDeleteConfirm = async () => {
    if (!automationToDelete) return;
    try {
      await deleteAutomationMutation.mutateAsync(automationToDelete.id);
      toast.success("Automação excluída com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao excluir automação", { description: err.message });
    } finally {
      setDeleteDialogOpen(false);
      setAutomationToDelete(null);
    }
  };

  const handleOpenSubscribersPopover = (automationId: string, currentSubscriberIds: string[]) => {
    setTempSubscriberSelections(prev => ({ ...prev, [automationId]: currentSubscriberIds }));
    setSearchTermSubscribers(prev => ({ ...prev, [automationId]: '' })); // Reset search term when opening
    setOpenPopovers(prev => ({ ...prev, [automationId]: true }));
  };

  const handleSaveSubscribers = async (automationId: string, currentAutomation: SubscriberAutomation) => {
    const selectedIds = tempSubscriberSelections[automationId] || [];
    try {
      await updateAutomationMutation.mutateAsync({ id: automationId, subscriber_ids: selectedIds });
      toast.success("Assinantes da automação atualizados!");
      // Re-agendar notificações após salvar os assinantes
      if (allUsers) {
        await scheduleNotificationsMutation.mutateAsync({
          automation: { ...currentAutomation, subscriber_ids: selectedIds }, // Usar a automação com os IDs atualizados
          subscribers: allUsers,
        });
      }
    } catch (err: any) {
      toast.error("Erro ao salvar assinantes da automação", { description: err.message });
    } finally {
      setOpenPopovers(prev => ({ ...prev, [automationId]: false }));
    }
  };

  const handleToggleSubscriber = (automationId: string, subscriberId: string) => {
    setTempSubscriberSelections(prev => {
      const current = prev[automationId] || [];
      const updated = current.includes(subscriberId)
        ? current.filter(id => id !== subscriberId)
        : [...current, subscriberId];
      return { ...prev, [automationId]: updated };
    });
  };

  const handleSelectAllFilteredSubscribers = (automationId: string, filteredActiveSubscribers: UserWithDetails[]) => {
    setTempSubscriberSelections(prev => {
      const currentSelected = new Set(prev[automationId] || []);
      filteredActiveSubscribers.forEach(subscriber => currentSelected.add(subscriber.id));
      return { ...prev, [automationId]: Array.from(currentSelected) };
    });
  };

  const handleDeselectAllSubscribers = (automationId: string, allActiveSubscribers: UserWithDetails[]) => {
    setTempSubscriberSelections(prev => {
      const currentSelected = new Set(prev[automationId] || []);
      allActiveSubscribers.forEach(subscriber => currentSelected.delete(subscriber.id));
      return { ...prev, [automationId]: Array.from(currentSelected) };
    });
  };

  const offsetOptions = [
    { value: -7, label: '7 dias antes do vencimento' },
    { value: -5, label: '5 dias antes do vencimento' },
    { value: -3, label: '3 dias antes do vencimento' },
    { value: -2, label: '2 dias antes do vencimento' },
    { value: -1, label: '1 dia antes do vencimento' },
    { value: 0, label: 'No dia do vencimento' },
    { value: 1, label: '1 dia após o vencimento' },
    { value: 2, label: '2 dias após o vencimento' },
    { value: 3, label: '3 dias após o vencimento' },
    { value: 5, label: '5 dias após o vencimento' },
    { value: 7, label: '7 dias após o vencimento' },
  ];

  // Filter automations based on search term
  const filteredAutomations = useMemo(() => {
    if (!automations) return [];
    if (!searchTerm) return automations;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return automations.filter(automation => {
      const templateName = templates?.find(t => t.id === automation.subscriber_template_id)?.name.toLowerCase() || '';
      const subscriberNames = automation.subscriber_ids.map(subscriberId => {
        return allUsers?.find(u => u.id === subscriberId)?.name.toLowerCase() || '';
      }).join(', ');

      return (
        automation.id.toLowerCase().includes(lowerCaseSearchTerm) ||
        templateName.includes(lowerCaseSearchTerm) ||
        subscriberNames.includes(lowerCaseSearchTerm) ||
        automation.days_offset.toString().includes(lowerCaseSearchTerm) ||
        automation.scheduled_time.includes(lowerCaseSearchTerm)
      );
    });
  }, [automations, searchTerm, templates, allUsers]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Automações de Assinantes</h1>
        <p className="text-muted-foreground mt-1">Configure regras para enviar mensagens automaticamente aos assinantes da plataforma.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar automações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <Button onClick={handleAddAutomation} disabled={isLoadingPage || createAutomationMutation.isPending} className="w-full sm:w-auto">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {isLoadingPage ? (
        <Card className="border-border bg-card">
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Carregando automações...</p>
          </CardContent>
        </Card>
      ) : filteredAutomations.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center text-sm">
              Nenhuma automação encontrada com os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Quando Enviar</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Horário</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Template da Mensagem</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Assinantes Configurados</TableHead>
                <TableHead className="w-[50px] text-xs sm:text-sm"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAutomations.map((automation) => {
                const activeSubscribers = allUsers?.filter(u => u.subscription?.status === 'active') || [];
                const selectedCount = automation.subscriber_ids.filter(id => activeSubscribers.some(u => u.id === id)).length;
                const totalCount = activeSubscribers.length;

                // Filter subscribers for the popover based on searchTermSubscribers
                const filteredSubscribersForPopover = activeSubscribers.filter(subscriber =>
                  subscriber.name.toLowerCase().includes(searchTermSubscribers[automation.id]?.toLowerCase() || '') ||
                  subscriber.email.toLowerCase().includes(searchTermSubscribers[automation.id]?.toLowerCase() || '') ||
                  (subscriber.phone && subscriber.phone.includes(searchTermSubscribers[automation.id]?.toLowerCase() || ''))
                );
                const isAllFilteredSelected = filteredSubscribersForPopover.length > 0 && filteredSubscribersForPopover.every(subscriber => (tempSubscriberSelections[automation.id] || []).includes(subscriber.id));


                return (
                  <TableRow key={automation.id}>
                    <TableCell className="text-xs sm:text-sm">
                      <Select
                        value={automation.days_offset.toString()}
                        onValueChange={(value) => {
                          updateAutomationMutation.mutate({
                            id: automation.id,
                            days_offset: parseInt(value),
                          });
                        }}
                      >
                        <SelectTrigger className="w-full min-w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {offsetOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="text-xs sm:text-sm">
                      <Input
                        type="time"
                        value={automation.scheduled_time.slice(0, 5)}
                        onChange={(e) => {
                          const newTime = e.target.value + ':00';
                          updateAutomationMutation.mutate({
                            id: automation.id,
                            scheduled_time: newTime,
                          });
                        }}
                        className="w-full min-w-[120px]"
                      />
                    </TableCell>

                    <TableCell className="text-xs sm:text-sm">
                      <Select
                        value={automation.subscriber_template_id}
                        onValueChange={(value) => {
                          updateAutomationMutation.mutate({
                            id: automation.id,
                            subscriber_template_id: value,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full min-w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {templates?.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="text-xs sm:text-sm">
                      <Popover
                        open={openPopovers[automation.id] || false}
                        onOpenChange={(open) => {
                          if (open) {
                            handleOpenSubscribersPopover(automation.id, automation.subscriber_ids);
                          } else {
                            setOpenPopovers(prev => ({ ...prev, [automation.id]: false }));
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full min-w-[140px] justify-start">
                            <Users className="mr-2 h-4 w-4" />
                            {selectedCount} / {totalCount} assinantes
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">Selecionar Assinantes</h4>
                            <div className="relative">
                              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar assinante..."
                                value={searchTermSubscribers[automation.id] || ''}
                                onChange={(e) => setSearchTermSubscribers(prev => ({ ...prev, [automation.id]: e.target.value }))}
                                className="pl-10 text-sm"
                              />
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`select-all-${automation.id}`}
                                  checked={isAllFilteredSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      handleSelectAllFilteredSubscribers(automation.id, filteredSubscribersForPopover);
                                    } else {
                                      handleDeselectAllSubscribers(automation.id, filteredSubscribersForPopover);
                                    }
                                  }}
                                />
                                <label htmlFor={`select-all-${automation.id}`} className="font-medium cursor-pointer">
                                  Selecionar Todos
                                </label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => handleDeselectAllSubscribers(automation.id, activeSubscribers)}
                                className="text-xs p-0 h-auto"
                              >
                                Desmarcar Todos
                              </Button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                              {filteredSubscribersForPopover.length === 0 ? (
                                <p className="text-muted-foreground text-sm text-center">Nenhum assinante encontrado.</p>
                              ) : (
                                filteredSubscribersForPopover.map((subscriber) => {
                                  const isChecked = (tempSubscriberSelections[automation.id] || automation.subscriber_ids).includes(subscriber.id);
                                  return (
                                    <div key={subscriber.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${automation.id}-${subscriber.id}`}
                                        checked={isChecked}
                                        onCheckedChange={() => handleToggleSubscriber(automation.id, subscriber.id)}
                                      />
                                      <label
                                        htmlFor={`${automation.id}-${subscriber.id}`}
                                        className="text-sm flex-1 cursor-pointer"
                                      >
                                        {subscriber.name} ({subscriber.email})
                                      </label>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setOpenPopovers(prev => ({ ...prev, [automation.id]: false }))}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveSubscribers(automation.id, automation)}
                                className="flex-1"
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>

                    <TableCell className="text-xs sm:text-sm">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAutomationToDelete(automation);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de automação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a automação? Esta ação é irreversível e removerá todos os agendamentos futuros associados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAutomationMutation.isPending}
            >
              {deleteAutomationMutation.isPending ? "Excluindo..." : "Excluir Automação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}