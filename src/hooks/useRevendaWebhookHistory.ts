import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RevendaWebhookHistoryEntry } from '@/integrations/supabase/schema';
import { useAuth } from '@/contexts/AuthContext';

const fetchRevendaWebhookHistory = async (): Promise<RevendaWebhookHistoryEntry[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  // The RLS policy for 'revenda_webhook_history' allows admins to view all entries.
  // Therefore, we ensure the user is authenticated and an admin before fetching.
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('revenda_webhook_history')
    .select('*')
    .order('received_at', { ascending: false }); // Order by received_at for most recent first

  if (error) throw error;
  return data;
};

export const useRevendaWebhookHistory = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<RevendaWebhookHistoryEntry[], Error>({
    queryKey: ['revendaWebhookHistory', user?.id, role], // Include user and role for cache invalidation
    queryFn: fetchRevendaWebhookHistory,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin', // Only enabled for authenticated admins
    staleTime: 1000 * 30, // Refresh every 30 seconds
  });
};