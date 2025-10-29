import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Profile,
  Enums,
  SubscriberPlan, SubscriberPlanInsert, SubscriberPlanUpdate,
  SubscriberAutomation, SubscriberAutomationInsert, SubscriberAutomationUpdate,
  SubscriberTemplate, SubscriberTemplateInsert, SubscriberTemplateUpdate,
  AppSubscriptionStatus, // Import the manually defined type
} from '@/integrations/supabase/schema';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { DateTime } from 'luxon';

const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
const DELETE_USER_EDGE_FUNCTION_NAME = "delete-subscriber-user"; // NEW Edge Function name
const DELETE_USER_EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${DELETE_USER_EDGE_FUNCTION_NAME}`;

export interface UserWithDetails extends Profile {
  role: Enums<'app_role'>;
  phone: string | null;
  subscription: {
    id: string;
    plan_name: string;
    price: number;
    status: AppSubscriptionStatus; // Use the new type
    next_billing_date: string | null;
    isFree: boolean;
  } | null;
  instance: {
    id: string;
    instance_name: string;
    status: string;
  } | null;
}

const fetchAllUsers = async (): Promise<UserWithDetails[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  // 1. Fetch all profiles with their roles
  const { data: profilesAndRoles, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      email,
      phone,
      created_at,
      user_roles(role)
    `);

  if (profilesError) {
    console.error("Error fetching profiles and roles:", profilesError);
    throw new Error(profilesError.message || "Erro ao buscar perfis de usuários.");
  }

  // 2. Fetch all user instances separately
  const { data: userInstancesData, error: instancesError } = await supabase
    .from('user_instances')
    .select('id, user_id, instance_name, status');

  if (instancesError) {
    console.error("Error fetching user instances:", instancesError);
    throw new Error(instancesError.message || "Erro ao buscar instâncias de usuários.");
  }

  const instanceMap = new Map(userInstancesData.map(inst => [inst.user_id, inst]));

  // 3. Fetch all subscriptions
  const { data: subscriptionsData, error: subscriptionsError } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_name, price, status, next_billing_date');

  if (subscriptionsError) {
    console.error("Error fetching subscriptions:", subscriptionsError);
    throw new Error(subscriptionsError.message || "Erro ao buscar assinaturas.");
  }

  // 4. Fetch all subscriber plans for is_free status
  const { data: subscriberPlansData, error: plansError } = await supabase
    .from('subscriber_plans')
    .select('name, is_free');

  if (plansError) {
    console.error("Error fetching subscriber plans:", plansError);
    throw new Error(plansError.message || "Erro ao buscar planos de assinantes.");
  }

  const planMap = new Map(subscriberPlansData.map(plan => [plan.name, plan.is_free]));

  // 5. Combine the data
  const formattedUsers = profilesAndRoles.map((profile: any) => {
    const userSubscription = subscriptionsData.find(sub => sub.user_id === profile.id);
    const isFreePlan = userSubscription ? planMap.get(userSubscription.plan_name) || false : false;

    const rolesArray = profile.user_roles || [];
    const userInstance = instanceMap.get(profile.id); // Get instance using profile.id (which is user_id)

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      created_at: profile.created_at,
      role: rolesArray.length > 0 ? rolesArray[0].role : 'user',
      subscription: userSubscription ? {
        id: userSubscription.id,
        plan_name: userSubscription.plan_name,
        price: userSubscription.price,
        status: userSubscription.status,
        next_billing_date: userSubscription.next_billing_date,
        isFree: isFreePlan,
      } : null,
      instance: userInstance ? {
        id: userInstance.id,
        instance_name: userInstance.instance_name,
        status: userInstance.status,
      } : null,
    };
  });

  return formattedUsers;
};

export const useAllUsers = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<UserWithDetails[], Error>({
    queryKey: ["allUsers", user?.id, role],
    queryFn: fetchAllUsers,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60,
  });
};

interface UpdateUserRolePayload {
  targetUserId: string;
  newRole: Enums<'app_role'>;
}

const updateUserRole = async (payload: UpdateUserRolePayload): Promise<any> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "update-user-role";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao atualizar função do usuário.");
  }

  return response.json();
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, UpdateUserRolePayload>({
    mutationFn: updateUserRole,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['profileAndSubscription', variables.targetUserId] });
      toast.success("Função do usuário atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar função do usuário", { description: error.message });
    },
  });
};

interface UpdateUserSubscriptionPayload {
  subscriptionId: string;
  userId: string;
  plan_name: string;
  price: number;
  status: AppSubscriptionStatus; // Use the new type
  next_billing_date: string | null;
}

const updateUserSubscription = async (payload: UpdateUserSubscriptionPayload): Promise<any> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "update-user-subscription";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao atualizar assinatura do usuário.");
  }

  return response.json();
};

export const useUpdateUserSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, UpdateUserSubscriptionPayload>({
    mutationFn: updateUserSubscription,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['profileAndSubscription', variables.userId] });
      toast.success("Assinatura do usuário atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar assinatura do usuário", { description: error.message });
    },
  });
};

interface RenewSubscriberParams {
  subscriptionId: string;
  targetUserId: string;
  planName: string;
  currentNextBillingDate: string;
  price: number;
}

const renewSubscriber = async (payload: RenewSubscriberParams): Promise<any> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "renew-subscriber-subscription";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao renovar assinatura do assinante.");
  }

  return response.json();
};

export const useRenewSubscriber = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, RenewSubscriberParams>({
    mutationFn: renewSubscriber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialEntries'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis'] });
      toast.success("Assinatura renovada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao renovar assinatura", { description: error.message });
    },
  });
};

interface SetSubscriberDueTodayParams {
  subscriptionId: string;
  targetUserId: string;
  currentStatus: AppSubscriptionStatus; // Use the new type
  price: number;
}

const setSubscriberDueToday = async (payload: SetSubscriberDueTodayParams): Promise<any> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "set-subscriber-due-today";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao definir vencimento para hoje.");
  }

  return response.json();
};

export const useSetSubscriberDueToday = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, SetSubscriberDueTodayParams>({
    mutationFn: setSubscriberDueToday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialEntries'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis'] });
      toast.success("Vencimento da assinatura definido para hoje!");
    },
    onError: (error) => {
      toast.error("Erro ao definir vencimento para hoje", { description: error.message });
    },
  });
};

const deleteUser = async (targetUserId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  // Call the new dedicated Edge Function for user deletion
  const response = await fetch(DELETE_USER_EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      userId: targetUserId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao excluir usuário.");
  }
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteUser,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables] });
      queryClient.invalidateQueries({ queryKey: ['profileAndSubscription', variables] });
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir usuário", { description: error.message });
    },
  });
};

const fetchSubscriberPlans = async (): Promise<SubscriberPlan[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "crud-subscriber-plans";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar planos de assinantes.");
  }

  return response.json();
};

export const useSubscriberPlans = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<SubscriberPlan[], Error>({
    queryKey: ["subscriberPlans", user?.id, role],
    queryFn: fetchSubscriberPlans,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60 * 5,
  });
};

const createSubscriberPlan = async (newPlan: SubscriberPlanInsert): Promise<SubscriberPlan> => {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "crud-subscriber-plans";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(newPlan),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao criar plano de assinante.");
  }

  return response.json();
};

export const useCreateSubscriberPlan = () => {
  const queryClient = useQueryClient();
  return useMutation<SubscriberPlan, Error, SubscriberPlanInsert>({
    mutationFn: createSubscriberPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriberPlans'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] }); // NOVO: Invalida o cache de todos os usuários
      toast.success("Plano de assinante criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro técnico ao criar template de assinante:", error);
      toast.error("Erro ao criar plano de assinante", { description: error.message });
    },
  });
};

const updateSubscriberPlan = async (updatedPlan: SubscriberPlanUpdate & { id: string }): Promise<SubscriberPlan> => {
  console.log('updateSubscriberPlan: Função de mutação iniciada com payload:', updatedPlan);
  const { id, ...updateData } = updatedPlan;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "crud-subscriber-plans";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}?id=${id}`;

  const fetchOptions: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(updateData),
  };

  console.log('useUpdateSubscriberPlan: Tentando requisição PUT com opções:', fetchOptions);

  const response = await fetch(EDGE_FUNCTION_URL, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('useUpdateSubscriberPlan: Falha na requisição com errorData:', errorData);
    throw new Error(errorData.error || "Erro ao atualizar plano de assinante.");
  }

  return response.json();
};

export const useUpdateSubscriberPlan = () => {
  const queryClient = useQueryClient();
  return useMutation<SubscriberPlan, Error, SubscriberPlanUpdate & { id: string }>({
    mutationFn: updateSubscriberPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriberPlans'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] }); // NOVO: Invalida o cache de todos os usuários
      toast.success("Plano de assinante atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("useUpdateSubscriberPlan: Mutação falhou:", error);
      toast.error("Erro ao atualizar plano de assinante", { description: error.message });
    },
  });
};

const deleteSubscriberPlan = async (id: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  const { data: planDetails, error: fetchError } = await supabase
    .from('subscriber_plans')
    .select('is_free, name')
    .eq('id', id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Erro ao verificar o plano: ${fetchError.message}`);
  }
  if (!planDetails) {
    throw new Error("Plano não encontrado.");
  }

  // NOVO: Impedir exclusão de planos 'Plano Inicial' e 'Plano Parceiro' no frontend
  if (planDetails.name === 'Plano Inicial' || planDetails.name === 'Plano Parceiro') {
    throw new Error(`Não é permitido excluir o plano "${planDetails.name}". Você pode editá-lo se necessário.`);
  }

  if (planDetails.is_free) {
    console.log(`Attempting direct deletion for free plan: ${planDetails.name} (ID: ${id})`);
    const { error: deleteError } = await supabase
      .from('subscriber_plans')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Direct deletion failed:', deleteError);
      throw new Error(deleteError.message || "Erro ao excluir plano gratuito diretamente.");
    }
  } else {
    console.log(`Chamando Edge Function DELETE para Plano Pago: https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/crud-subscriber-plans?id=${id}`);
    const EDGE_FUNCTION_NAME = "crud-subscriber-plans";
    const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}?id=${id}`;

    const fetchOptions: RequestInit = {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: undefined,
    };

    console.log('useDeleteSubscriberPlan: Tentando requisição DELETE com opções:', fetchOptions);

    const response = await fetch(EDGE_FUNCTION_URL, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('useDeleteSubscriberPlan: Falha na requisição com errorData:', errorData);
      throw new Error(errorData.error || "Erro ao excluir plano de assinante.");
    }
  }
};

export const useDeleteSubscriberPlan = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteSubscriberPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriberPlans'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] }); // NOVO: Invalida o cache de todos os usuários
      toast.success("Plano de assinante excluído com sucesso!");
    },
    onError: (error) => {
      console.error("useDeleteSubscriberPlan: Mutação falhou:", error);
      toast.error("Erro ao excluir plano de assinante", { description: error.message });
    },
  });
};

const fetchSubscriberTemplates = async (): Promise<SubscriberTemplate[]> => {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "crud-subscriber-templates";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar templates de assinantes.");
  }

  return response.json();
};

export const useSubscriberTemplates = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<SubscriberTemplate[], Error>({
    queryKey: ["subscriberTemplates", user?.id, role],
    queryFn: fetchSubscriberTemplates,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60 * 5,
  });
};

const createSubscriberTemplate = async (newTemplate: SubscriberTemplateInsert): Promise<SubscriberTemplate> => {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "crud-subscriber-templates";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(newTemplate),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao criar template de assinante.");
  }

  return response.json();
};

export const useCreateSubscriberTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<SubscriberTemplate, Error, SubscriberTemplateInsert>({
    mutationFn: createSubscriberTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriberTemplates'] });
      toast.success("Template de assinante criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro técnico ao criar template de assinante:", error);
      toast.error("Erro ao criar template de assinante", { description: error.message });
    },
  });
};

const updateSubscriberTemplate = async (updatedTemplate: SubscriberTemplateUpdate & { id: string }): Promise<SubscriberTemplate> => {
  const { id, ...updateData } = updatedTemplate;
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "crud-subscriber-templates";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const fetchOptions: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(updateData),
  };

  console.log('useUpdateSubscriberTemplate: Tentando requisição PUT com opções:', fetchOptions);

  const response = await fetch(EDGE_FUNCTION_URL, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('useUpdateSubscriberTemplate: Falha na requisição com errorData:', errorData);
    throw new Error(errorData.error || "Erro ao atualizar template de assinante.");
  }

  return response.json();
};

export const useUpdateSubscriberTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<SubscriberTemplate, Error, SubscriberTemplateUpdate & { id: string }>({
    mutationFn: updateSubscriberTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriberTemplates'] });
      toast.success("Template de assinante atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro técnico ao atualizar template de assinante:", error);
      toast.error("Erro ao atualizar template de assinante", { description: error.message });
    },
  });
};

const deleteSubscriberTemplate = async (id: string): Promise<void> => {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "crud-subscriber-templates";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const fetchOptions: RequestInit = {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: undefined,
  };

  console.log('useDeleteSubscriberTemplate: Tentando requisição DELETE com opções:', fetchOptions);

  const response = await fetch(EDGE_FUNCTION_URL, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('useDeleteSubscriberTemplate: Falha na requisição com errorData:', errorData);
    throw new Error(errorData.error || "Erro ao excluir template de assinante.");
  }
};

export const useDeleteSubscriberTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteSubscriberTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriberTemplates'] });
      toast.success("Template de assinante excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro técnico ao excluir template de assinante:", error);
      toast.error("Erro ao excluir template de assinante", { description: error.message });
    },
  });
};

const fetchSubscriberAutomations = async (): Promise<SubscriberAutomation[]> => {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "crud-subscriber-automations";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar automações de assinantes.");
  }

  return response.json();
};

export const useSubscriberAutomations = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<SubscriberAutomation[], Error>({
    queryKey: ["subscriberAutomations", user?.id, role],
    queryFn: fetchSubscriberAutomations,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60,
  });
};

interface ScheduleSubscriberNotificationsPayload {
  automation: SubscriberAutomation;
  subscribers: UserWithDetails[];
}

const scheduleSubscriberNotificationsForRule = async (payload: ScheduleSubscriberNotificationsPayload) => {
  const { automation, subscribers } = payload;
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const notificationsToInsert: { user_id: string; subscriber_template_id: string; send_at: string; status: 'pending' }[] = [];
  const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
  const [scheduledHour, scheduledMinute] = automation.scheduled_time.split(':').map(Number);
  const now = DateTime.now();

  const relevantSubscribers = subscribers.filter(s =>
    automation.subscriber_ids.includes(s.id) && s.subscription?.status === 'active'
  );

  for (const subscriber of relevantSubscribers) {
    if (!subscriber.subscription?.next_billing_date) continue;

    const localBillingDate = DateTime.fromISO(subscriber.subscription.next_billing_date, { zone: SAO_PAULO_TIMEZONE }).startOf('day');
    const targetDate = localBillingDate.plus({ days: automation.days_offset });

    const localTargetDateTime = targetDate.set({
        hour: scheduledHour,
        minute: scheduledMinute
    });

    const sendAtUtcIso = localTargetDateTime.toUTC().toISO();

    if (!sendAtUtcIso) {
        console.warn(`Skipping notification for subscriber ${subscriber.id} due to invalid date/time conversion.`);
        continue;
    }

    if (localTargetDateTime.toMillis() >= now.toMillis() - (60 * 1000)) {
        notificationsToInsert.push({
            user_id: subscriber.id,
            subscriber_template_id: automation.subscriber_template_id,
            send_at: sendAtUtcIso,
            status: 'pending',
        });
    }
  }

  if (notificationsToInsert.length === 0) {
      console.log("Nenhuma notificação futura para agendar para esta regra de assinante.");
      return { success: true, message: 'Nenhuma notificação futura para agendar.' };
  }

  const EDGE_FUNCTION_NAME = "schedule-subscriber-notifications";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

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
    throw new Error(errorData.error || "Erro ao invocar a Edge Function de agendamento de assinantes.");
  }

  return response.json();
};

export const useScheduleSubscriberNotificationsForRule = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, ScheduleSubscriberNotificationsPayload>({
    mutationFn: scheduleSubscriberNotificationsForRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['connectionMetrics'] });
      toast.success('Fila de envios para assinantes agendada com sucesso!');
    },
    onError: (error) => toast.error(`Erro ao agendar fila de envios para assinantes: ${error.message}`),
  });
};

export const useCreateSubscriberAutomation = () => {
  const queryClient = useQueryClient();
  const scheduleMutation = useScheduleSubscriberNotificationsForRule();
  const { data: allUsers } = useAllUsers();

  // Omit admin_user_id from the input type as it's added internally
  type CreatePayload = Omit<SubscriberAutomationInsert, 'admin_user_id'>;

  return useMutation<SubscriberAutomation, Error, CreatePayload>({
    mutationFn: async (newAutomationData) => {
      const { data: { session } = {} } = await supabase.auth.getSession();
      if (!session || !session.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from('subscriber_automations')
        .insert({ ...newAutomationData, admin_user_id: session.user.id })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as SubscriberAutomation;
    },
    onSuccess: async (newAutomation) => {
      queryClient.invalidateQueries({ queryKey: ['subscriberAutomations'] });
      queryClient.invalidateQueries({ queryKey: ['connectionMetrics'] });
      toast.success('Automação de assinante criada!');

      if (allUsers) {
        await scheduleMutation.mutateAsync({
          automation: newAutomation,
          subscribers: allUsers,
        });
      }
    },
    onError: (error) => toast.error(`Erro ao criar automação de assinante: ${error.message}`),
  });
};

export const useUpdateSubscriberAutomation = () => {
  const queryClient = useQueryClient();
  const scheduleMutation = useScheduleSubscriberNotificationsForRule();
  const { data: allUsers } = useAllUsers();

  // Omit admin_user_id from the input type as it's handled internally
  type UpdatePayload = Omit<SubscriberAutomationUpdate, 'admin_user_id'> & { id: string };

  return useMutation<SubscriberAutomation, Error, UpdatePayload>({
    mutationFn: async (updatedAutomationData) => {
      const { id, ...updateData } = updatedAutomationData;
      const { data: { session } = {} } = await supabase.auth.getSession();
      if (!session || !session.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from('subscriber_automations')
        .update(updateData)
        .eq('id', id)
        .eq('admin_user_id', session.user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as SubscriberAutomation;
    },
    onSuccess: async (updatedAutomation) => {
      queryClient.invalidateQueries({ queryKey: ['subscriberAutomations'] });
      queryClient.invalidateQueries({ queryKey: ['connectionMetrics'] });
      toast.success('Automação de assinante atualizada!');

      if (allUsers) {
        await scheduleMutation.mutateAsync({
          automation: updatedAutomation,
          subscribers: allUsers,
        });
      }
    },
    onError: (error) => toast.error(`Erro ao atualizar automação de assinante: ${error.message}`),
  });
};

const deleteSubscriberAutomation = async (id: string): Promise<void> => {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('automation_id', id)
    .eq('user_id', session.user.id)
    .eq('type', 'subscriber_notification');

  const { error } = await supabase
    .from('subscriber_automations')
    .delete()
    .eq('id', id)
    .eq('admin_user_id', session.user.id);

  if (error) throw new Error(error.message);
};

export const useDeleteSubscriberAutomation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteSubscriberAutomation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriberAutomations'] });
      queryClient.invalidateQueries({ queryKey: ['connectionMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledNotifications'] });
      toast.success('Automação de assinante excluída e agendamentos removidos!');
    },
    onError: (error) => toast.error(`Erro ao excluir automação de assinante: ${error.message}`),
  });
};

const fetchN8nMessageSenderUrl = async (): Promise<string | null> => {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('webhook_configs')
    .select('url')
    .eq('type', 'n8n_message_sender')
    .maybeSingle();

  if (error) throw error;
  return data?.url || null;
};

export const useN8nMessageSenderUrl = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<string | null, Error>({
    queryKey: ['n8nMessageSenderUrl', user?.id, role],
    queryFn: fetchN8nMessageSenderUrl,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60 * 5,
  });
};

interface SendSubscriberMessagePayload {
  n8nWebhookUrl: string;
  subscriber: UserWithDetails;
  templateId: string;
  renderedTextContent: string;
}

const sendSubscriberMessageViaWebhook = async ({ n8nWebhookUrl, subscriber, templateId, renderedTextContent }: SendSubscriberMessagePayload) => {
  const { data: { session } = {} } = await supabase.auth.getSession();
  const adminUser = session?.user;
  if (!adminUser) throw new Error('Administrador não autenticado');

  const { data: adminUserInstance, error: instanceError } = await supabase
    .from('user_instances')
    .select('instance_name')
    .eq('user_id', adminUser.id)
    .single();

  if (instanceError || !adminUserInstance?.instance_name) {
    throw new Error('Nenhuma instância do WhatsApp configurada para o administrador. Por favor, conecte o WhatsApp em "Conexão > WhatsApp".');
  }
  const instanceName = adminUserInstance.instance_name;

  const requestBody = {
    body: [
      {
        instanceName: instanceName,
        contact_name: subscriber.name,
        number: subscriber.phone,
        text: renderedTextContent,
        mode: "real"
      }
    ]
  };

  let statusCode: number | null = null;
  let responsePayload: any = null;
  let errorMessage: string | null = null;

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    statusCode = response.status;
    
    try {
      responsePayload = await response.json();
    } catch (jsonError) {
      responsePayload = await response.text();
      console.warn("Webhook response was not JSON, read as text.", jsonError);
    }

    if (!response.ok) {
      errorMessage = responsePayload?.message || response.statusText || `O servidor de automação retornou um erro com status ${statusCode}.`;
      throw new Error(errorMessage || 'An unknown error occurred during webhook processing.');
    }

    return { success: true, statusCode };

  } catch (error: any) {
    errorMessage = error.message;
    console.error("Erro ao enviar mensagem via webhook para assinante:", error);
    throw new Error(errorMessage || 'An unknown error occurred.');
  } finally {
    await supabase
      .from('n8n_message_sender_history')
      .insert({
        user_id: adminUser.id,
        client_id: subscriber.id,
        template_id: templateId,
        webhook_type: 'n8n_message_outbound_subscriber',
        payload: requestBody,
        request_payload: requestBody,
        response_payload: responsePayload,
        status_code: statusCode,
        client_name_snapshot: subscriber.name,
      });
  }
};

export const useSendSubscriberMessageWebhook = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, SendSubscriberMessagePayload>({
    mutationFn: sendSubscriberMessageViaWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookHistory', 'n8n_message_sender_history', 'n8n_message_outbound_subscriber'] });
    },
  });
};

interface UpdateUserInstanceStatusPayload {
  instanceId: string;
  newStatus: string;
}

const updateUserInstanceStatus = async (payload: UpdateUserInstanceStatusPayload): Promise<any> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "update-user-instance-status";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao atualizar status da instância do usuário.");
  }

  return response.json();
};

export const useUpdateUserInstanceStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, UpdateUserInstanceStatusPayload>({
    mutationFn: updateUserInstanceStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userInstance'] });
      toast.success("Status da instância atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status da instância", { description: error.message });
    },
  });
};