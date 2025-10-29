import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/schema';
import { useAuth } from '@/contexts/AuthContext';

// Estender FinancialEntry para incluir o nome do criador
export interface AdminFinancialEntryWithCreator extends Tables<'financial_entries'> {
  profiles: { name: string | null } | null; // Resultado do join do Supabase
  creatorName?: string | null; // Propriedade mapeada para fácil acesso
}

const fetchAdminFinancialEntriesWithCreator = async (userId: string): Promise<AdminFinancialEntryWithCreator[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  // Busca lançamentos financeiros e faz um join com a tabela profiles para obter o nome do criador
  const { data, error } = await supabase
    .from('financial_entries')
    .select(`
      *,
      profiles(name) -- Sintaxe simplificada para o join com a tabela profiles
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Mapeia os dados para incluir a propriedade creatorName
  return data.map(entry => ({
    ...entry,
    creatorName: (entry.profiles as { name: string | null } | null)?.name || null,
  })) as AdminFinancialEntryWithCreator[];
};

export const useAdminFinancialEntriesWithCreator = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();

  return useQuery<AdminFinancialEntryWithCreator[], Error>({
    queryKey: ['adminFinancialEntriesWithCreator', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return fetchAdminFinancialEntriesWithCreator(user.id);
    },
    enabled: !isLoadingAuth && !!user?.id && role === 'admin', // Ativado apenas para administradores autenticados
  });
};