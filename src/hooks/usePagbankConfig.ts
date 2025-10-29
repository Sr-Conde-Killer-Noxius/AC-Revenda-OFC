import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/schema';

// Definir o tipo para a tabela pagbank_configs
export type PagbankConfig = Tables<'pagbank_configs'>;
export type PagbankConfigInsert = TablesInsert<'pagbank_configs'>;
export type PagbankConfigUpdate = TablesUpdate<'pagbank_configs'>;

const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
const EDGE_FUNCTION_NAME = "crud-pagbank-configs";
const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

// --- Fetch PagBank Config ---
const fetchPagbankConfig = async (): Promise<PagbankConfig | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar configurações do PagBank.");
  }

  return response.json();
};

export const usePagbankConfig = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<PagbankConfig | null, Error>({
    queryKey: ["pagbankConfig", user?.id, role],
    queryFn: fetchPagbankConfig,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
};

// --- Save PagBank Config (Upsert) ---
const savePagbankConfig = async (config: PagbankConfigInsert): Promise<PagbankConfig> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST", // Usamos POST para upsert, a Edge Function lida com a lógica
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao salvar configurações do PagBank.");
  }

  return response.json();
};

export const useSavePagbankConfig = () => {
  const queryClient = useQueryClient();
  return useMutation<PagbankConfig, Error, PagbankConfigInsert>({
    mutationFn: savePagbankConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagbankConfig'] });
      toast.success("Configurações do PagBank salvas com sucesso!");
    },
    onError: (_error) => {
      toast.error("Erro ao salvar configurações do PagBank", { description: "Não foi possível salvar as configurações do PagBank. Tente novamente." });
    },
  });
};