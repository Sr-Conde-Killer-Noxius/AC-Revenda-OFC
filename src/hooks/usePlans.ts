import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plan as BasePlan, PlanInsert, PlanUpdate } from '@/integrations/supabase/schema';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { toast } from "sonner"; // Import toast

// Estender o tipo Plan para incluir as propriedades adicionadas no hook
export interface Plan extends BasePlan {
  profiles: { name: string | null } | null; // Resultado do join do Supabase
  creatorName?: string | null; // Propriedade mapeada para fácil acesso
}

// --- Fetch Plans ---
const fetchPlans = async (userId: string, userRole: string | null): Promise<Plan[]> => {
  let query = supabase
    .from('plans')
    .select('*, profiles(name)') // Seleciona todos os campos do plano e o 'name' do perfil
    .order('name');

  // Aplica o filtro APENAS se o usuário NÃO for admin
  if (userRole !== 'admin') {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  
  // Mapeia os dados para incluir a propriedade creatorName
  return data.map(plan => ({
    ...plan,
    creatorName: (plan.profiles as { name: string | null } | null)?.name || null,
  })) as Plan[];
};

export const usePlans = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth(); // Get user and role from AuthContext

  return useQuery<Plan[], Error>({ // Usar o tipo Plan estendido
    queryKey: ['plans', user?.id, role], // Add role to query key
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return fetchPlans(user.id, role);
    },
    enabled: !isLoadingAuth && !!user?.id, // Only enable if auth is loaded and user is present
  });
};

// --- Create Plan ---
const createPlan = async (newPlan: PlanInsert): Promise<Plan> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('plans')
    .insert({ ...newPlan, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Plan;
};

export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation<Plan, Error, PlanInsert>({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Clientes podem precisar de planos atualizados
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] }); // Análise pode depender de planos
    },
    onError: (_error) => toast.error("Erro ao criar plano", { description: "Não foi possível criar o plano. Tente novamente." }),
  });
};

// --- Update Plan ---
const updatePlan = async (updatedPlan: PlanUpdate & { id: string }): Promise<Plan> => {
  const { id, ...updateData } = updatedPlan;
  const { data, error } = await supabase
    .from('plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Plan;
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation<Plan, Error, PlanUpdate & { id: string }>({
    mutationFn: updatePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Clientes podem precisar de planos atualizados
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] }); // Análise pode depender de planos
    },
    onError: (_error) => toast.error("Erro ao atualizar plano", { description: "Não foi possível atualizar o plano. Tente novamente." }),
  });
};

// --- Delete Plan ---
const deletePlan = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Clientes podem precisar de planos atualizados
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] }); // Análise pode depender de planos
    },
    onError: (_error) => toast.error("Erro ao deletar plano", { description: "Não foi possível excluir o plano. Tente novamente." }),
  });
};