import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/schema'; // Importar Json do schema
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// Definir uma interface base que todas as tabelas de histórico devem seguir
interface BaseHistoryEntry {
  id: string;
  user_id: string | null; // Pode ser null se o user_id não for encontrado no momento do log
  webhook_type: string;
  payload: Json;
  request_payload: Json | null;
  response_payload: Json | null;
  status_code: number | null;
  timestamp: string;
  client_id: string | null;
  template_id: string | null;
  client_name_snapshot: string | null;
}

// Definir os nomes das tabelas de histórico permitidos
type HistoryTableNames = 'evolution_api_history' | 'n8n_qr_code_history' | 'n8n_message_sender_history' | 'webhook_history' | 'evolution_logout_history';

// A função de fetch agora é genérica e retorna um array do tipo T
const fetchWebhookHistory = async <T extends BaseHistoryEntry>(
  tableName: HistoryTableNames,
  webhookTypes: string | string[] | null,
  userId: string,
  userRole: string | null
): Promise<T[]> => {
  let query = supabase
    .from(tableName)
    .select('*');

  // Apply filter ONLY if the user is NOT an admin
  if (userRole !== 'admin') {
    query = query.eq('user_id', userId);
  }

  if (webhookTypes && (Array.isArray(webhookTypes) ? webhookTypes.length > 0 : true)) {
    const types = Array.isArray(webhookTypes) ? webhookTypes : [webhookTypes];
    query = query.in('webhook_type', types);
  }

  const { data, error } = await query
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    console.error(`Error fetching webhook history from ${tableName}:`, error.message);
    throw new Error(`Failed to fetch history from ${tableName}: ${error.message}`);
  }
  return data as T[] || [];
};

// O hook useWebhookHistory também é genérico
export const useWebhookHistory = <T extends BaseHistoryEntry>(
  tableName: HistoryTableNames,
  webhookTypes?: string | string[] | null
) => {
  const { user, role, isLoading: isLoadingAuth } = useAuth(); // Get user and role from AuthContext

  const typesKey = Array.isArray(webhookTypes) ? webhookTypes.join(',') : (webhookTypes === null ? 'all_inbound' : webhookTypes || 'all');
  
  return useQuery<T[], Error>({
    queryKey: ['webhookHistory', tableName, typesKey, user?.id, role], // Add user.id and role to query key
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return fetchWebhookHistory<T>(tableName, webhookTypes || null, user.id, role); // Explicitly pass null if webhookTypes is undefined
    },
    enabled: !isLoadingAuth && !!user?.id, // Only enable if auth is loaded and user is present
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });
};