import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/schema';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface LogEvolutionLogoutPayload {
  requestPayload: Json;
  responsePayload: Json | null;
  statusCode: number | null;
  errorMessage: string | null;
  instanceName: string;
}

const logEvolutionLogoutHistory = async (payload: LogEvolutionLogoutPayload): Promise<any> => {
  const { requestPayload, responsePayload, statusCode, errorMessage, instanceName } = payload;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Service role bypasses RLS, so no explicit user_id filter needed here.
  const { data, error } = await supabase
    .from('evolution_logout_history')
    .insert({
      user_id: user.id,
      webhook_type: 'n8n_evolution_logout_outbound', // Tipo para logs de logout
      payload: { instanceName, requestPayload, responsePayload, errorMessage },
      request_payload: requestPayload,
      response_payload: responsePayload,
      status_code: statusCode,
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting into evolution_logout_history:', error.message);
    throw new Error(`Failed to log Evolution logout interaction: ${error.message}`);
  }
  return data;
};

export const useLogEvolutionLogoutHistory = () => {
  const queryClient = useQueryClient();
  const { user, role } = useAuth(); // Get user and role from AuthContext

  return useMutation<any, Error, LogEvolutionLogoutPayload>({
    mutationFn: logEvolutionLogoutHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookHistory', 'evolution_logout_history', user?.id, role] }); // Add user.id and role to query key
    },
    onError: (_error) => {
      toast.error('Erro ao registrar histórico de logout', { description: "Não foi possível registrar o histórico de logout. Tente novamente." });
    },
  });
};