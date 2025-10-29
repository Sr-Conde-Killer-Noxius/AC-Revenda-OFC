import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WebhookConfig } from '@/integrations/supabase/schema';
import { toast } from "sonner";
// Removed: import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// A interface WebhookConfig já é exportada do schema.ts

const fetchWebhookConfig = async (type: string): Promise<WebhookConfig | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // RLS will handle access based on role. For SELECT, any authenticated user can read.
  const { data, error } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('type', type) // Removed .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const useWebhookConfig = (type: string) => {
  return useQuery<WebhookConfig | null, Error>({
    queryKey: ['webhookConfig', type],
    queryFn: () => fetchWebhookConfig(type),
  });
};

const saveWebhookConfig = async (type: string, url: string): Promise<WebhookConfig> => {
  const { data: { session } } = await supabase.auth.getSession(); // Corrected: Destructure 'session'
  if (!session || !session.user) throw new Error('Usuário não autenticado'); // Corrected: Check 'session' and 'session.user'

  // The user_id is still passed, but RLS will ensure only admins can perform upsert.
  const { data, error } = await supabase
    .from('webhook_configs')
    .upsert({
      user_id: session.user.id, // user_id is still a column, but RLS controls who can modify it
      type,
      url,
      payload: {}, // Adicionado para satisfazer o campo 'payload' obrigatório
    }, {
      onConflict: 'type' // Changed onConflict to 'type' since it's global per type
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const useSaveWebhookConfig = () => {
  const queryClient = useQueryClient();

  return useMutation<WebhookConfig, Error, { type: string; url: string }>({
    mutationFn: ({ type, url }) => saveWebhookConfig(type, url),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['webhookConfig', variables.type] });
      toast.success('Configuração salva!', { description: 'URL do webhook atualizada com sucesso.' });
    },
    onError: (_error) => {
      toast.error('Erro ao salvar', { description: "Não foi possível salvar a configuração. Tente novamente." });
    },
  });
};