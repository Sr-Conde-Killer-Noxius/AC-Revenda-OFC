import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { MercadoPagoConfig, MercadoPagoConfigInsert } from '@/integrations/supabase/schema';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
const EDGE_FUNCTION_NAME = "crud-mercado-pago-configs";
const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

// --- Fetch Mercado Pago Config ---
const fetchMercadoPagoConfig = async (): Promise<MercadoPagoConfig | null> => {
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
    throw new Error(errorData.error || "Erro ao buscar configurações do Mercado Pago.");
  }

  return response.json();
};

export const useMercadoPagoConfig = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<MercadoPagoConfig | null, Error>({
    queryKey: ["mercadoPagoConfig", user?.id, role],
    queryFn: fetchMercadoPagoConfig,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
};

// --- Save Mercado Pago Config (Upsert) ---
const saveMercadoPagoConfig = async (config: MercadoPagoConfigInsert): Promise<MercadoPagoConfig> => {
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
    throw new Error(errorData.error || "Erro ao salvar configurações do Mercado Pago.");
  }

  return response.json();
};

export const useSaveMercadoPagoConfig = () => {
  const queryClient = useQueryClient();
  return useMutation<MercadoPagoConfig, Error, MercadoPagoConfigInsert>({
    mutationFn: saveMercadoPagoConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mercadoPagoConfig'] });
      toast.success("Configurações do Mercado Pago salvas com sucesso!");
    },
    onError: (_error) => {
      toast.error("Erro ao salvar configurações do Mercado Pago", { description: "Não foi possível salvar as configurações do Mercado Pago. Tente novamente." });
    },
  });
};