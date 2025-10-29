import { DateTime } from 'luxon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { useTemplates } from '@/hooks/useTemplates';
import { useClients } from '@/hooks/useClients';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Automation as BaseAutomation, AutomationInsert, AutomationUpdate, Client } from '@/integrations/supabase/schema';
import { toast } from 'sonner';
import { PlusCircle as PlusCircleIcon, Search as SearchIcon, Trash2, Users } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Estender o tipo Automation para incluir as propriedades adicionadas no hook
export interface Automation extends BaseAutomation {
  profiles: { name: string | null } | null; // Resultado do join do Supabase
  creatorName?: string | null; // Propriedade mapeada para fácil acesso
}

// --- HOOKS DE DADOS REAIS ---

// Fetch Automations
const fetchAutomations = async (userId: string, userRole: string | null): Promise<Automation[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  let query = supabase
    .from('automations')
    .select('*') // Removido profiles(name) daqui para evitar o erro de relacionamento
    .order('created_at', { ascending: true });

  // Aplica o filtro APENAS se o usuário NÃO for admin
  if (userRole !== 'admin') {
    query = query.eq('user_id', userId);
  }

  const { data: automationsData, error: automationsError } = await query;

  if (automationsError) throw new Error(automationsError.message);

  let finalAutomations: Automation[] = automationsData || [];

  // Se for admin, busca os nomes dos perfis separadamente e os mapeia
  if (userRole === 'admin' && finalAutomations.length > 0) {
    const creatorIds = [...new Set(finalAutomations.map(auto => auto.user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', creatorIds);

    if (profilesError) {
      console.warn("Erro ao buscar perfis para automações (visão admin):", profilesError.message);
      // Continua sem os nomes dos criadores se houver um erro ao buscar perfis
    } else {
      const profileMap = new Map(profilesData.map(p => [p.id, p.name]));
      finalAutomations = finalAutomations.map(auto => ({
        ...auto,
        creatorName: profileMap.get(auto.user_id) || null,
      }));
    }
  }

  return finalAutomations as Automation[];
};

export const useAutomations = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();

  return useQuery<Automation[], Error>({
    queryKey: ['automations', user?.id, role],
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return fetchAutomations(user.id, role);
    },
    enabled: !isLoadingAuth && !!user?.id,
  });
};

// Interface para o payload que a Edge Function espera
interface EdgeFunctionNotificationPayload {
  client_id: string;
  template_id: string;
  send_at: string; // ISO string UTC
  client_name_snapshot: string; // NOVO: Adicionado client_name_snapshot
}

// Interface para o payload da mutação no frontend
interface ScheduleNotificationsForRuleMutationPayload {
  automation: Automation;
  clients: Client[];
}

const scheduleNotificationsForRule = async (payload: ScheduleNotificationsForRuleMutationPayload) => {
  const { automation, clients } = payload;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const notificationsToInsert: EdgeFunctionNotificationPayload[] = [];
  const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
  const [scheduledHour, scheduledMinute] = automation.scheduled_time.split(':').map(Number);
  const now = DateTime.now();

  // Filtra apenas clientes ativos ou vencidos que estão na automação
  const relevantClients = clients.filter(c => 
    automation.client_ids.includes(c.id) && (c.status === 'active' || c.status === 'overdue')
  );

  for (const client of relevantClients) {
    if (!client.next_billing_date) continue;

    // A data do Supabase vem como 'YYYY-MM-DD'. Adicionar T00:00:00 para tratar como data local.
    const localBillingDate = DateTime.fromISO(client.next_billing_date, { zone: SAO_PAULO_TIMEZONE }).startOf('day');
    const targetDate = localBillingDate.plus({ days: automation.days_offset });
    
    // Cria a data/hora final no fuso horário local (São Paulo) usando Luxon
    const localTargetDateTime = targetDate.set({
        hour: scheduledHour,
        minute: scheduledMinute
    });

    // Converte para UTC e obtém a string ISO
    const sendAtUtcIso = localTargetDateTime.toUTC().toISO();

    // Adicionar verificação para sendAtUtcIso ser null
    if (!sendAtUtcIso) {
        console.warn(`Skipping notification for client ${client.id} due to invalid date/time conversion.`);
        continue;
    }

    // Adiciona à lista se a data for no futuro (ou no máximo 1 minuto no passado para tolerância)
    if (localTargetDateTime.toMillis() >= now.toMillis() - (60 * 1000)) {
        notificationsToInsert.push({
            client_id: client.id,
            template_id: automation.template_id,
            send_at: sendAtUtcIso,
            client_name_snapshot: client.name, // NOVO: Adiciona o nome do cliente
        });
    }
  }
  
  // Se não houver nada a agendar, não chama a função da Edge Function
  if (notificationsToInsert.length === 0) {
      console.log("Nenhuma notificação futura para agendar para esta regra.");
      return { success: true, message: 'Nenhuma notificação futura para agendar.' };
  }

  // A URL da Edge Function
  const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
  const EDGE_FUNCTION_NAME = "schedule-notifications-for-rule";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  // O body da requisição agora envia os agendamentos prontos
  const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ automationId: automation.id, notifications: notificationsToInsert }),
  });

  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao invocar a Edge Function.");
  }

  return response.json();
};

export const useScheduleNotificationsForRule = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, ScheduleNotificationsForRuleMutationPayload>({
    mutationFn: scheduleNotificationsForRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['connectionMetrics'] });
      toast.success('Fila de envios agendada com sucesso!');
    },
    onError: (error) => toast.error(`Erro ao agendar fila de envios: ${error.message}`),
  });
};

// Create Automation
export const useCreateAutomation = () => {
  const queryClient = useQueryClient();
  const scheduleMutation = useScheduleNotificationsForRule();
  const { data: clients } = useClients();

  return useMutation<Automation, Error, AutomationInsert>({
    mutationFn: async (newAutomationData) => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from('automations')
        .insert({ ...newAutomationData, user_id: user.id })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Automation;
    },
    onSuccess: async (newAutomation) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['connectionMetrics'] });
      toast.success('Automação criada!');

      if (clients) {
        await scheduleMutation.mutateAsync({ 
          automation: newAutomation, 
          clients: clients 
        });
      }
    },
    onError: (error) => toast.error(`Erro ao criar automação: ${error.message}`),
  });
};

// Update Automation
export const useUpdateAutomation = () => {
  const queryClient = useQueryClient();
  const scheduleMutation = useScheduleNotificationsForRule();
  const { data: clients } = useClients();

  return useMutation<Automation, Error, AutomationUpdate & { id: string }>({
    mutationFn: async (updatedAutomationData) => {
      const { id, ...updateData } = updatedAutomationData;
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from('automations')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Automation;
    },
    onSuccess: async (updatedAutomation) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['connectionMetrics'] });
      toast.success('Automação atualizada!');

      if (clients) {
        await scheduleMutation.mutateAsync({ 
          automation: updatedAutomation, 
          clients: clients 
        });
      }
    },
    onError: (error) => toast.error(`Erro ao atualizar automação: ${error.message}`),
  });
};

// Delete Automation
const deleteAutomation = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Deleta agendamentos pendentes associados a esta automação
  await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('automation_id', id)
    .eq('user_id', user.id);

  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
};

export const useDeleteAutomation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteAutomation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['connectionMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledNotifications'] });
      toast.success('Automação excluída e agendamentos removidos!');
    },
    onError: (error) => toast.error(`Erro ao excluir automação: ${error.message}`),
  });
};

export default function AutomationsPage() {
  const { role } = useAuth(); // Obter a função do usuário
  const { data: automations, isLoading: isLoadingAutomations, error: automationsError } = useAutomations();
  const { data: templates, isLoading: isLoadingTemplates, error: templatesError } = useTemplates();
  const { data: clients, isLoading: isLoadingClients, error: clientsError } = useClients();

  const createAutomationMutation = useCreateAutomation();
  const updateAutomationMutation = useUpdateAutomation();
  const deleteAutomationMutation = useDeleteAutomation();

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<Automation | null>(null);
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  const [tempClientSelections, setTempClientSelections] = useState<Record<string, string[]>>({});
  const [searchTermClients, setSearchTermClients] = useState<Record<string, string>>({}); // Novo estado para busca de clientes no popover

  useEffect(() => {
    if (automationsError) toast.error(`Erro ao carregar automações: ${automationsError.message}`);
    if (templatesError) toast.error(`Erro ao carregar templates: ${templatesError.message}`);
    if (clientsError) toast.error(`Erro ao carregar clientes: ${clientsError.message}`);
  }, [automationsError, templatesError, clientsError]);

  const handleAddAutomation = async () => {
    if (!templates || templates.length === 0) {
      toast.error("É necessário ter pelo menos um template cadastrado para criar uma automação.");
      return;
    }
    if (!clients || clients.length === 0) {
      toast.error("É necessário ter pelo menos um cliente cadastrado para criar uma automação.");
      return;
    }

    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      await createAutomationMutation.mutateAsync({
        days_offset: -1,
        template_id: templates[0].id,
        client_ids: clients.filter((c: Client) => c.status === 'active').map((c: Client) => c.id),
        scheduled_time: '09:00:00',
        user_id: user.id,
      });
    } catch (error) {
      // Erro já tratado no onSuccess/onError do hook
    }
  };

  const isLoadingPage = isLoadingAutomations || isLoadingTemplates || isLoadingClients;

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

  const handleOpenClientsPopover = (automationId: string, currentClientIds: string[]) => {
    setTempClientSelections(prev => ({ ...prev, [automationId]: currentClientIds }));
    setSearchTermClients(prev => ({ ...prev, [automationId]: '' })); // Reset search term when opening
    setOpenPopovers(prev => ({ ...prev, [automationId]: true }));
  };

  const handleSaveClients = (automationId: string) => {
    const selectedIds = tempClientSelections[automationId] || [];
    updateAutomationMutation.mutate({ id: automationId, client_ids: selectedIds });
    setOpenPopovers(prev => ({ ...prev, [automationId]: false }));
  };

  const handleToggleClient = (automationId: string, clientId: string) => {
    setTempClientSelections(prev => {
      const current = prev[automationId] || [];
      const updated = current.includes(clientId)
        ? current.filter(id => id !== clientId)
        : [...current, clientId];
      return { ...prev, [automationId]: updated };
    });
  };

  const handleSelectAllClients = (automationId: string, filteredActiveClients: Client[]) => {
    setTempClientSelections(prev => {
      const currentSelected = new Set(prev[automationId] || []);
      filteredActiveClients.forEach(client => currentSelected.add(client.id));
      return { ...prev, [automationId]: Array.from(currentSelected) };
    });
  };

  const handleDeselectAllClients = (automationId: string, filteredActiveClients: Client[]) => {
    setTempClientSelections(prev => {
      const currentSelected = new Set(prev[automationId] || []);
      filteredActiveClients.forEach(client => currentSelected.delete(client.id));
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
      const templateName = templates?.find(t => t.id === automation.template_id)?.name.toLowerCase() || '';
      const clientNames = automation.client_ids.map(clientId => {
        return clients?.find(c => c.id === clientId)?.name.toLowerCase() || '';
      }).join(', ');
      const creatorName = automation.creatorName?.toLowerCase() || ''; // Incluir nome do criador na busca

      return (
        automation.id.toLowerCase().includes(lowerCaseSearchTerm) ||
        templateName.includes(lowerCaseSearchTerm) ||
        clientNames.includes(lowerCaseSearchTerm) ||
        automation.days_offset.toString().includes(lowerCaseSearchTerm) ||
        automation.scheduled_time.includes(lowerCaseSearchTerm) ||
        creatorName.includes(lowerCaseSearchTerm) // Adicionar busca pelo nome do criador
      );
    });
  }, [automations, searchTerm, templates, clients]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Automações de Clientes</h1>
        <p className="text-muted-foreground mt-1">Configure regras para enviar mensagens automaticamente aos clientes da plataforma.</p>
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
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Clientes Configurados</TableHead>
                {role === 'admin' && <TableHead className="whitespace-nowrap text-xs sm:text-sm">Criado Por</TableHead>} {/* Coluna condicional */}
                <TableHead className="w-[50px] text-xs sm:text-sm"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAutomations.map((automation) => {
                const activeClients = clients?.filter(c => c.status === 'active' || c.status === 'overdue') || [];
                const selectedCount = automation.client_ids.filter(id => activeClients.some(c => c.id === id)).length;
                const totalCount = activeClients.length;

                // Filter clients for the popover based on searchTermClients
                const filteredClientsForPopover = activeClients.filter(client =>
                  client.name.toLowerCase().includes(searchTermClients[automation.id]?.toLowerCase() || '')
                );
                const isAllFilteredSelected = filteredClientsForPopover.length > 0 && filteredClientsForPopover.every(client => (tempClientSelections[automation.id] || []).includes(client.id));


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
                        value={automation.template_id}
                        onValueChange={(value) => {
                          updateAutomationMutation.mutate({
                            id: automation.id,
                            template_id: value,
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
                            handleOpenClientsPopover(automation.id, automation.client_ids);
                          } else {
                            setOpenPopovers(prev => ({ ...prev, [automation.id]: false }));
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full min-w-[140px] justify-start">
                            <Users className="mr-2 h-4 w-4" />
                            {selectedCount} / {totalCount} clientes
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">Selecionar Clientes</h4>
                            <div className="relative">
                              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar cliente..."
                                value={searchTermClients[automation.id] || ''}
                                onChange={(e) => setSearchTermClients(prev => ({ ...prev, [automation.id]: e.target.value }))}
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
                                      handleSelectAllClients(automation.id, filteredClientsForPopover);
                                    } else {
                                      handleDeselectAllClients(automation.id, filteredClientsForPopover);
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
                                onClick={() => handleDeselectAllClients(automation.id, activeClients)}
                                className="text-xs p-0 h-auto"
                              >
                                Desmarcar Todos
                              </Button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                              {filteredClientsForPopover.length === 0 ? (
                                <p className="text-muted-foreground text-sm text-center">Nenhum cliente encontrado.</p>
                              ) : (
                                filteredClientsForPopover.map((client) => {
                                  const isChecked = (tempClientSelections[automation.id] || automation.client_ids).includes(client.id);
                                  return (
                                    <div key={client.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${automation.id}-${client.id}`}
                                        checked={isChecked}
                                        onCheckedChange={() => handleToggleClient(automation.id, client.id)}
                                      />
                                      <label
                                        htmlFor={`${automation.id}-${client.id}`}
                                        className="text-sm flex-1 cursor-pointer"
                                      >
                                        {client.name}
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
                                onClick={() => handleSaveClients(automation.id)}
                                className="flex-1"
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>

                    {role === 'admin' && ( // Célula condicional para o nome do criador
                      <TableCell className="text-xs sm:text-sm">
                        {automation.creatorName || 'Desconhecido'}
                      </TableCell>
                    )}

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