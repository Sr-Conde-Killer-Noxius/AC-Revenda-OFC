import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client as BaseClient, ClientInsert, ClientUpdate, ClientStatus, Plan } from '@/integrations/supabase/schema';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { toast } from "sonner"; // Import toast

// Estender o tipo Client para incluir as propriedades adicionadas no hook
export interface Client extends BaseClient {
  planDetailsValue?: number | null;
  planDetailsName?: string | null;
  profiles: { name: string | null } | null; // Resultado do join do Supabase
  creatorName?: string | null; // Propriedade mapeada para fácil acesso
}

// O tipo Client já é importado de schema.ts, que já inclui a relação com 'plans'.
// Não precisamos mais de BaseClient ou de estender Client aqui.

// --- Fetch Clients ---
const fetchClients = async (userId: string, userRole: string | null): Promise<Client[]> => { // Usar o tipo Client estendido
  let query = supabase
    .from('clients')
    .select('*, plans(name, value), profiles(name)') // Seleciona todos os campos do cliente, o 'name' e 'value' do plano, e o 'name' do perfil
    .order('name');

  // Aplica o filtro APENAS se o usuário NÃO for admin
  if (userRole !== 'admin') {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  
  // Mapeia os dados para incluir o valor e o nome do plano diretamente no objeto do cliente
  return data.map(client => ({
    ...client,
    planDetailsValue: (client.plans as Plan | null)?.value, // Atribui o valor do plano à nova propriedade
    planDetailsName: (client.plans as Plan | null)?.name, // Atribui o nome do plano à nova propriedade
    creatorName: (client.profiles as { name: string | null } | null)?.name || null, // Atribui o nome do criador
  })) as Client[]; // Adiciona type assertion para garantir que o tipo está correto
};

export const useClients = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth(); // Get user and role from AuthContext

  return useQuery<Client[], Error>({ // Usar o tipo Client estendido
    queryKey: ['clients', user?.id, role], // Add role to query key
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return fetchClients(user.id, role);
    },
    enabled: !isLoadingAuth && !!user?.id, // Only enable if auth is loaded and user is present
  });
};

// --- Create Client ---
const createClient = async (newClient: ClientInsert): Promise<Client> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...newClient, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Client;
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation<Client, Error, ClientInsert>({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['automations'] }); // Invalida automações
    },
    onError: (_error) => toast.error("Erro ao criar cliente", { description: "Não foi possível criar o cliente. Tente novamente." }),
  });
};

// --- Update Client ---
const updateClient = async (updatedClient: ClientUpdate & { id: string }): Promise<Client> => {
  const { id, ...updateData } = updatedClient;
  const { data, error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Client;
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation<Client, Error, ClientUpdate & { id: string }>({
    mutationFn: updateClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['automations'] }); // Invalida automações
    },
    onError: (_error) => toast.error("Erro ao atualizar cliente", { description: "Não foi possível atualizar o cliente. Tente novamente." }),
  });
};

// --- Delete Client ---
const deleteClient = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['automations'] }); // Invalida automações
    },
    onError: (_error) => toast.error("Erro ao deletar cliente", { description: "Não foi possível excluir o cliente. Tente novamente." }),
  });
};

// --- Renew Client ---
interface RenewClientParams {
  clientId: string;
  planPeriodDays: number;
  currentNextBillingDate: string;
  clientName: string;
  clientValue: number;
}

const renewClient = async ({ clientId, planPeriodDays, currentNextBillingDate, clientName, clientValue }: RenewClientParams): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const date = new Date(currentNextBillingDate);
  date.setDate(date.getDate() + planPeriodDays);
  const newNextBillingDate = format(date, 'yyyy-MM-dd');

  const { error: updateError } = await supabase
    .from("clients")
    .update({ next_billing_date: newNextBillingDate, status: "active" })
    .eq("id", clientId);

  if (updateError) throw new Error(updateError.message);

  // Registrar a renovação como uma entrada financeira
  const { error: financialError } = await supabase.from("financial_entries").insert({
    user_id: user.id,
    description: `Renovação - ${clientName}`,
    value: clientValue,
    type: "credit",
  });

  if (financialError) {
    console.error("Erro ao registrar entrada financeira de renovação:", financialError.message);
    throw new Error(`Erro ao registrar entrada financeira: ${financialError.message}`);
  }
};

export const useRenewClient = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, RenewClientParams>({
    mutationFn: renewClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['financialEntries'] }); // Invalida extrato
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['automations'] }); // Invalida automações
    },
    onError: (_error) => toast.error("Erro ao renovar cliente", { description: "Não foi possível renovar o cliente. Tente novamente." }),
  });
};

// --- Update Client Status ---
interface UpdateClientStatusParams {
  clientId: string;
  newStatus: ClientStatus;
  clientName: string;
  planId: string;
  planName: string;
  clientValue: number;
}

const updateClientStatus = async ({ clientId, newStatus, clientName, planId, planName, clientValue }: UpdateClientStatusParams): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Se o status for alterado para 'inactive', registrar evento de churn
  if (newStatus === "inactive") {
    const { error: logError } = await supabase.from("logs").insert({
      user_id: user.id,
      action: "client_churned",
      details: {
        client_id: clientId,
        client_name: clientName,
        plan_id: planId,
        plan_name: planName,
        plan_value: clientValue,
      },
    });
    if (logError) console.error("Erro ao registrar evento de churn:", logError.message);
  }

  const { error } = await supabase
    .from("clients")
    .update({ status: newStatus })
    .eq("id", clientId);

  if (error) throw new Error(error.message);
};

export const useUpdateClientStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateClientStatusParams>({
    mutationFn: updateClientStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['automations'] }); // Invalida automações
    },
    onError: (_error) => toast.error("Erro ao atualizar status do cliente", { description: "Não foi possível atualizar o status do cliente. Tente novamente." }),
  });
};

// --- Set Client Due Today ---
interface SetClientDueTodayParams {
  clientId: string;
  clientName: string;
  currentStatus: ClientStatus;
}

const setClientDueToday = async ({ clientId, currentStatus }: SetClientDueTodayParams): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const today = format(new Date(), 'yyyy-MM-dd');
  const newStatus = currentStatus === "inactive" ? "active" : currentStatus;

  const { error } = await supabase
    .from("clients")
    .update({ next_billing_date: today, status: newStatus })
    .eq("id", clientId);

  if (error) throw new Error(error.message);
};

export const useSetClientDueToday = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SetClientDueTodayParams>({
    mutationFn: setClientDueToday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['automations'] }); // Invalida automações
    },
    onError: (_error) => toast.error("Erro ao definir vencimento do cliente para hoje", { description: "Não foi possível definir o vencimento para hoje. Tente novamente." }),
  });
};