import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialEntry, FinancialEntryInsert, FinancialEntryUpdate } from '@/integrations/supabase/schema';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { toast } from "sonner"; // Import toast

// --- Fetch Financial Entries ---
const fetchFinancialEntries = async (userId: string, userRole: string | null): Promise<FinancialEntry[]> => {
  let query = supabase
    .from('financial_entries')
    .select('*')
    .order('created_at', { ascending: false });

  // Aplica o filtro APENAS se o usuário NÃO for admin
  if (userRole !== 'admin') {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data || [];
};

export const useFinancialEntries = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth(); // Get user and role from AuthContext

  return useQuery<FinancialEntry[], Error>({
    queryKey: ['financialEntries', user?.id, role], // Add role to query key
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return fetchFinancialEntries(user.id, role);
    },
    enabled: !isLoadingAuth && !!user?.id, // Only enable if auth is loaded and user is present
  });
};

// --- Create Financial Entry ---
const createFinancialEntry = async (newEntry: FinancialEntryInsert): Promise<FinancialEntry> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('financial_entries')
    .insert({ ...newEntry, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FinancialEntry;
};

export const useCreateFinancialEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<FinancialEntry, Error, FinancialEntryInsert>({
    mutationFn: createFinancialEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialEntriesWithCreator'] }); // Invalida o cache admin também
      queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis'] });
    },
    onError: (_error) => {
      toast.error("Erro ao criar lançamento financeiro", { description: "Não foi possível criar o lançamento financeiro. Tente novamente." });
    },
  });
};

// --- Update Financial Entry ---
const updateFinancialEntry = async (updatedEntry: FinancialEntryUpdate & { id: string }): Promise<FinancialEntry> => {
  const { id, ...updateData } = updatedEntry;
  const { data, error } = await supabase
    .from('financial_entries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FinancialEntry;
};

export const useUpdateFinancialEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<FinancialEntry, Error, FinancialEntryUpdate & { id: string }>({
    mutationFn: updateFinancialEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialEntries'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialEntriesWithCreator'] }); // Invalida o cache admin também
      queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis'] });
    },
    onError: (_error) => {
      toast.error("Erro ao atualizar lançamento financeiro", { description: "Não foi possível atualizar o lançamento financeiro. Tente novamente." });
    },
  });
};

// --- Delete Financial Entry ---
const deleteFinancialEntry = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('financial_entries')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

export const useDeleteFinancialEntry = () => {
  const queryClient = useQueryClient();
  const { user, role } = useAuth(); // Obter user e role do AuthContext

  return useMutation<void, Error, string>({
    mutationFn: deleteFinancialEntry,
    onSuccess: () => {
      // Invalida o cache do usuário comum
      queryClient.invalidateQueries({ queryKey: ['financialEntries', user?.id, 'user'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary', user?.id, 'user'] });
      queryClient.invalidateQueries({ queryKey: ['financialAnalysis', user?.id, 'user'] });

      // Se o usuário for admin, invalida também o cache administrativo
      if (role === 'admin') {
        queryClient.invalidateQueries({ queryKey: ['adminFinancialEntriesWithCreator', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary', user?.id, 'admin'] });
        queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis', user?.id, 'admin'] });
      }
    },
    onError: (_error) => {
      toast.error("Erro ao excluir lançamento financeiro", { description: "Não foi possível excluir o lançamento financeiro. Tente novamente." });
    },
  });
};