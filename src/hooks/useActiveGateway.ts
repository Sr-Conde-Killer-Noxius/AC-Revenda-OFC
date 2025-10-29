import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { ActivePaymentGateway, ActivePaymentGatewayInsert } from '@/integrations/supabase/schema';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
const EDGE_FUNCTION_NAME = "crud-active-gateway";
const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

// --- Fetch Active Payment Gateway ---
const fetchActiveGateway = async (): Promise<ActivePaymentGateway | null> => {
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
    throw new Error(errorData.error || "Erro ao buscar gateway de pagamento ativo.");
  }

  return response.json();
};

export const useActiveGateway = () => {
  const { user, isLoading: isLoadingAuth } = useAuth(); // Removed role from destructuring
  return useQuery<ActivePaymentGateway | null, Error>({
    queryKey: ["activePaymentGateway", user?.id], // Removed role from query key
    queryFn: fetchActiveGateway,
    enabled: !isLoadingAuth && !!user?.id, // Removed role === 'admin' condition
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
};

// --- Save Active Payment Gateway (Upsert) ---
const saveActiveGateway = async (gatewayName: string): Promise<ActivePaymentGateway> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const payload: ActivePaymentGatewayInsert = { gateway_name: gatewayName };

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST", // Usamos POST para upsert, a Edge Function lida com a lógica
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao salvar gateway de pagamento ativo.");
  }

  return response.json();
};

export const useSaveActiveGateway = () => {
  const queryClient = useQueryClient();
  return useMutation<ActivePaymentGateway, Error, string>({
    mutationFn: saveActiveGateway,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activePaymentGateway'] });
      toast.success("Gateway ativo salvo com sucesso!");
    },
    onError: (_error) => {
      toast.error("Erro ao salvar gateway ativo", { description: "Não foi possível salvar o gateway de pagamento ativo. Tente novamente." });
    },
  });
};