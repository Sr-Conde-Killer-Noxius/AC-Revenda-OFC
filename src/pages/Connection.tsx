import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { nanoid } from 'nanoid';
import { UserInstance, UserInstanceInsert, UserInstanceUpdate } from "@/integrations/supabase/schema";
import { useWebhookConfig } from '@/hooks/useWebhookConfig';
import { useLogEvolutionLogoutHistory } from '@/hooks/useEvolutionLogoutHistory'; // NOVO: Importar o hook de histórico de logout

type ConnectionStatus = "disconnected" | "connecting" | "connected";

// Define a URL fixa da Edge Function que atua como listener da Evolution API
const SUPABASE_PROJECT_ID = 'cgqyfpsfymhntumrmbzj';
const EVOLUTION_WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/evolution-webhook-receiver`;

// --- Hooks para gerenciar a instância do usuário ---
const fetchUserInstance = async (): Promise<UserInstance | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('user_instances')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = No rows found
  return data;
};

export const useUserInstance = () => {
  return useQuery<UserInstance | null, Error>({
    queryKey: ['userInstance'],
    queryFn: fetchUserInstance,
  });
};

const createUserInstance = async (newEntry: UserInstanceInsert): Promise<UserInstance> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('user_instances')
    .insert({ ...newEntry, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserInstance;
};

export const useCreateUserInstance = () => {
  const queryClient = useQueryClient();
  return useMutation<UserInstance, Error, UserInstanceInsert>({
    mutationFn: createUserInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInstance'] });
    },
  });
};

const updateUserInstance = async (updatedEntry: UserInstanceUpdate & { id: string }): Promise<UserInstance> => {
  const { id, ...updateData } = updatedEntry;
  const { data, error } = await supabase
    .from('user_instances')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserInstance;
};

export const useUpdateUserInstance = () => {
  const queryClient = useQueryClient();
  return useMutation<UserInstance, Error, UserInstanceUpdate & { id: string }>({
    mutationFn: updateUserInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInstance'] });
    },
  });
};

export default function Connection() {
  const { data: userInstance, isLoading: isLoadingInstance, error: instanceError } = useUserInstance();
  const updateUserInstanceMutation = useUpdateUserInstance();
  const logEvolutionLogoutMutation = useLogEvolutionLogoutHistory(); // NOVO: Hook de mutação para log de logout

  // BLOC 1: Buscar a URL do webhook de geração de QR Code do n8n
  const { data: n8nQrWebhookConfig, isLoading: isLoadingN8nQrConfig, error: n8nQrConfigError } = useWebhookConfig('n8n_qr_code_generator');
  // NOVO: Buscar a URL do webhook de logout da Evolution API
  const { data: n8nEvolutionLogoutConfig, isLoading: isLoadingN8nEvolutionLogout, error: n8nEvolutionLogoutError } = useWebhookConfig('n8n_evolution_logout');


  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (userInstance) {
      setConnectionStatus(userInstance.status as ConnectionStatus);
      setQrCodeBase64(userInstance.qr_code_base64 || null);
    } else if (!isLoadingInstance && !instanceError) {
      setConnectionStatus("disconnected");
      setQrCodeBase64(null);
    }
  }, [userInstance, isLoadingInstance, instanceError]);

  useEffect(() => {
    if (instanceError) {
      toast.error("Erro ao carregar dados da conexão", { description: instanceError.message });
    }
    // Exibir erro se a configuração do webhook de QR Code falhar
    if (n8nQrConfigError) {
      toast.error("Erro ao carregar configuração do webhook de QR Code", { description: n8nQrConfigError.message });
    }
    // NOVO: Exibir erro se a configuração do webhook de logout falhar
    if (n8nEvolutionLogoutError) {
      toast.error("Erro ao carregar configuração do webhook de logout", { description: n8nEvolutionLogoutError.message });
    }
  }, [instanceError, n8nQrConfigError, n8nEvolutionLogoutError]);

  // --- Supabase Realtime Listener ---
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel('instance-status-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_instances', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          console.log('Status da instância alterado via Realtime!', payload.new);
          const newStatus = payload.new.status as ConnectionStatus;
          const newQrCode = payload.new.qr_code_base64 || null;
          setConnectionStatus(newStatus);
          setQrCodeBase64(newQrCode);

          if (newStatus === 'connected') {
            toast.success("Conectado!", { description: "Seu WhatsApp foi conectado com sucesso." });
          } else if (newStatus === 'disconnected' && !isLoading) {
            toast.error("Desconectado", { description: "Seu WhatsApp foi desconectado." });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, isLoading]);


  const getStatusDisplay = (status: ConnectionStatus) => {
    switch (status) {
      case "disconnected":
        return { label: "Desconectado", variant: "destructive" as const };
      case "connecting":
        return { label: "Aguardando QR Code...", variant: "secondary" as const };
      case "connected":
        return { label: "Conectado", variant: "default" as const };
      default:
        return { label: "Desconhecido", variant: "secondary" as const };
    }
  };

  const logN8nQrInteraction = async (
    requestPayload: any,
    responsePayload: any,
    statusCode: number | null,
    errorMessage: string | null,
    instanceName: string
  ) => {
    if (!currentUserId) return;

    try {
      const { error: invokeError } = await supabase.functions.invoke('log-n8n-qr-interaction', {
        body: {
          requestPayload,
          responsePayload,
          statusCode,
          errorMessage,
          instanceName,
        },
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
      });

      if (invokeError) {
        console.error('Error invoking log-n8n-qr-interaction:', invokeError.message);
      }
    } catch (logError: any) {
      console.error('Failed to log N8N QR interaction:', logError.message);
    }
  };

  const handleGenerateQrCode = async () => {
    setIsLoading(true);
    setError(null);
    setQrCodeBase64(null);
    setConnectionStatus("connecting");

    let requestBody: any = {};
    let responseData: any = null;
    let httpStatusCode: number | null = null;
    let currentInstanceName: string = '';
    let currentInstanceId: string | undefined = userInstance?.id;
    let operationErrorMessage: string | null = null;

    try {
      // BLOC 1: Obter a URL do webhook de geração de QR Code do n8n
      if (isLoadingN8nQrConfig) {
        throw new Error('Configuração do webhook de QR Code ainda está carregando.');
      }
      if (n8nQrConfigError) {
        throw new Error('Erro ao carregar URL do webhook de QR Code: ' + n8nQrConfigError.message);
      }
      if (!n8nQrWebhookConfig?.url) {
        throw new Error('URL do webhook de QR Code do n8n não configurada. Configure em Conexão > Webhooks.');
      }

      const n8n_qr_code_webhook_url = n8nQrWebhookConfig.url;
      const evolution_listener_url = EVOLUTION_WEBHOOK_URL; // URL fixa da nossa Edge Function

      // --- PASSO 2: GARANTIR A EXISTÊNCIA DE UMA INSTÂNCIA PARA O UTILIZADOR ---
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      if (userInstance) {
        currentInstanceName = userInstance.instance_name;
        currentInstanceId = userInstance.id;
        await updateUserInstanceMutation.mutateAsync({
          id: currentInstanceId,
          status: "connecting",
          qr_code_base64: null,
        });
      } else {
        const newName = `user-${nanoid(10)}`;
        const { data: newInstance, error: createError } = await supabase
          .from('user_instances')
          .insert({ user_id: user.id, instance_name: newName, status: "connecting", qr_code_base64: null })
          .select('id, instance_name')
          .single();
        
        if (createError) {
          throw new Error('Erro ao criar a instância do utilizador: ' + createError.message);
        }
        currentInstanceName = newInstance.instance_name;
        currentInstanceId = newInstance.id;
      }

      // --- PASSO 3: ENVIAR A REQUISIÇÃO PARA O N8N COM TODOS OS DADOS ---
      requestBody = {
        instanceName: currentInstanceName,
        webhook: {
          url: evolution_listener_url, // Esta é a URL da nossa Supabase Edge Function
          events: ['CONNECTION_UPDATE']
        }
      };

      const response = await fetch(n8n_qr_code_webhook_url, { // Usar a URL correta do webhook do n8n
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      httpStatusCode = response.status;
      
      try {
        responseData = await response.json();
        console.log('N8N QR Code webhook raw JSON response:', JSON.stringify(responseData, null, 2)); // Log adicionado
      } catch (jsonError) {
        responseData = await response.text();
        console.warn("N8N QR Code webhook response was not JSON, read as text.", jsonError);
        console.log('N8N QR Code webhook raw text response:', responseData); // Log adicionado
      }

      // --- NEW LOGIC: Prioritize QR code display if available ---
      let qrCodeBase64FromResponse: string | null = null;

      // CORRECTED LOGIC HERE
      if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].base64) {
        qrCodeBase64FromResponse = responseData[0].base64;
        console.log('QR Code found at responseData[0].base64'); // Log adicionado
      } else if (responseData?.responsePayload?.qrcode?.base64) { // Fallback for a different structure if it ever occurs
        qrCodeBase64FromResponse = responseData.responsePayload.qrcode.base64;
        console.log('QR Code found at responseData.responsePayload.qrcode.base64 (fallback)'); // Log adicionado
      } else if (responseData?.base64) { // Fallback for QR code directly at root
        qrCodeBase64FromResponse = responseData.base64;
        console.log('QR Code found at responseData.base64 (fallback)'); // Log adicionado
      } else {
        console.warn('QR Code not found in expected paths within responseData.'); // Log adicionado
      }
      
      console.log('handleGenerateQrCode: Extracted qrCodeBase64FromResponse:', qrCodeBase64FromResponse ? 'YES' : 'NO'); // Added log

      const instanceNameFromResponse = responseData?.instanceName || currentInstanceName;

      if (qrCodeBase64FromResponse) {
        setQrCodeBase64(qrCodeBase64FromResponse);
        if (currentInstanceId) {
          await updateUserInstanceMutation.mutateAsync({
            id: currentInstanceId,
            instance_name: instanceNameFromResponse,
            qr_code_base64: qrCodeBase64FromResponse,
            status: "connecting",
          });
        }
        toast.success("QR Code gerado!", { description: "Escaneie o QR Code com seu celular para conectar." });
        return;
      }

      if (!response.ok) {
        throw new Error(responseData.message || 'O servidor de automação retornou um erro.');
      }

      console.log('handleGenerateQrCode: qrCodeBase64FromResponse is empty, throwing error.'); // Added log
      throw new Error('Não foi possível obter o QR Code na resposta do servidor. Tente novamente.');

    } catch (err: any) {
      operationErrorMessage = err.message;
      setError(err.message);
      // BLOC 2: Tratamento de Erro no Envio do POST - Reverter status para 'disconnected' no DB
      if (userInstance?.id) {
        await updateUserInstanceMutation.mutateAsync({
          id: userInstance.id,
          status: "disconnected",
          qr_code_base64: null,
        });
      }
      setConnectionStatus("disconnected"); // Atualiza o estado local imediatamente
      setQrCodeBase64(null); // Limpa o QR code imediatamente
      console.error("Erro detalhado no processo de gerar QR Code:", err);
      toast.error("Erro ao gerar QR Code", { description: err.message });
    } finally {
      setIsLoading(false);
      // Logar a interação com o N8N QR Code, independentemente do sucesso ou falha
      if (currentUserId && currentInstanceName) {
        logN8nQrInteraction(
          requestBody,
          responseData,
          httpStatusCode,
          operationErrorMessage,
          currentInstanceName
        );
      }
    }
  };

  const handleDisconnect = async () => {
    if (!userInstance || !userInstance.id || !userInstance.instance_name) {
      toast.error("Erro", { description: "Nenhuma instância para desconectar." });
      return;
    }

    setIsLoading(true);
    setError(null);

    let requestBody: any = {};
    let responseData: any = null;
    let httpStatusCode: number | null = null;
    let operationErrorMessage: string | null = null;

    try {
      // NOVO: Buscar a URL do webhook de logout do n8n
      if (isLoadingN8nEvolutionLogout) {
        throw new Error('Configuração do webhook de logout ainda está carregando.');
      }
      if (n8nEvolutionLogoutError) {
        throw new Error('Erro ao carregar URL do webhook de logout: ' + n8nEvolutionLogoutError.message);
      }
      if (!n8nEvolutionLogoutConfig?.url) {
        throw new Error('URL do webhook de logout do n8n não configurada. Configure em Conexão > Webhooks.');
      }

      const n8n_evolution_logout_webhook_url = n8nEvolutionLogoutConfig.url;
      const instanceName = userInstance.instance_name;

      requestBody = {
        instanceName: instanceName,
        Event: "Disconnect" // Payload conforme especificado
      };

      const response = await fetch(n8n_evolution_logout_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      httpStatusCode = response.status;
      
      try {
        responseData = await response.json();
      } catch (jsonError) {
        responseData = await response.text();
        console.warn("N8N Evolution Logout webhook response was not JSON, read as text.", jsonError);
      }

      if (!response.ok) {
        throw new Error(responseData.message || 'O servidor de automação retornou um erro ao tentar desconectar.');
      }

      toast.success("Solicitação de desconexão enviada!", { description: "Aguarde a confirmação." });
      // O status será atualizado via Realtime pelo evolution-webhook-receiver
      
    } catch (err: any) {
      operationErrorMessage = err.message;
      setError(err.message);
      console.error("Erro detalhado no processo de desconexão:", err);
      toast.error("Erro ao desconectar", { description: err.message });
    } finally {
      setIsLoading(false);
      // Logar a interação de logout, independentemente do sucesso ou falha
      if (currentUserId && userInstance?.instance_name) {
        logEvolutionLogoutMutation.mutate({
          requestPayload: requestBody,
          responsePayload: responseData,
          statusCode: httpStatusCode,
          errorMessage: operationErrorMessage,
          instanceName: userInstance.instance_name,
        });
      }
    }
  };

  // BLOC 3: Função para o botão "Cancelar"
  const handleCancelConnection = async () => {
    if (!userInstance || !userInstance.id) {
      toast.error("Erro", { description: "Nenhuma instância para cancelar a conexão." });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateUserInstanceMutation.mutateAsync({
        id: userInstance.id,
        status: "disconnected",
        qr_code_base64: null,
      });
      // O listener Realtime irá atualizar o estado local automaticamente
      toast.info("Conexão cancelada", { description: "O processo de conexão foi cancelado." });
    } catch (err: any) {
      setError(err.message);
      toast.error("Erro ao cancelar conexão", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const { label, variant } = getStatusDisplay(connectionStatus);

  if (isLoadingInstance) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Carregando status da conexão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Conexão com WhatsApp</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie a integração do seu sistema com o WhatsApp</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl">
            Status: <Badge variant={variant}>{label}</Badge>
          </CardTitle>
          <CardDescription className="text-sm">
            {connectionStatus === "disconnected" && "Para enviar notificações, conecte seu número de WhatsApp."}
            {connectionStatus === "connecting" && "Aguardando leitura do QR Code..."}
            {connectionStatus === "connected" && "Dispositivo conectado com sucesso!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              <p className="font-medium">Erro:</p>
              <p>{error}</p>
            </div>
          )}

          {connectionStatus === "disconnected" && (
            <Button onClick={handleGenerateQrCode} className="w-full" disabled={isLoading || isLoadingN8nQrConfig}>
              {isLoading || isLoadingN8nQrConfig ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando QR Code...
                </>
              ) : (
                "Gerar QR Code"
              )}
            </Button>
          )}

          {connectionStatus === "connecting" && (
            <div className="flex flex-col items-center justify-center space-y-4">
              {isLoading ? (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              ) : qrCodeBase64 ? (
                <div>
                  <p className="text-muted-foreground mb-4 text-sm">Escaneie o QR Code com o seu WhatsApp.</p>
                  <img 
                    src={
                      qrCodeBase64.startsWith('data:image') 
                        ? qrCodeBase64 
                        : `data:image/png;base64,${qrCodeBase64}`
                    } 
                    alt="WhatsApp QR Code"
                    className="mx-auto rounded-lg border-4 border-white bg-white max-w-full h-auto"
                  />
                  <p className="text-xs text-muted-foreground mt-4">Escaneie o QR Code com o seu celular.</p>
                </div>
              ) : (
                <p className="text-muted-foreground mb-4 text-sm">Gerando QR Code... Por favor, aguarde.</p>
              )}
              <Button onClick={handleCancelConnection} variant="outline" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando...
                  </>
                ) : (
                  "Cancelar"
                )}
              </Button>
            </div>
          )}

          {connectionStatus === "connected" && (
            <Button onClick={handleDisconnect} variant="destructive" className="w-full" disabled={isLoading || isLoadingN8nEvolutionLogout}>
              {isLoading || isLoadingN8nEvolutionLogout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Desconectando...
                </>
              ) : (
                "Desconectar"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}