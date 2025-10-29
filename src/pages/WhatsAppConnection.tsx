import { useState, useEffect } from "react";
import { QrCode, X, Power, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function WhatsAppConnection() {
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadUserInstance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("user_instances")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConnectionStatus(data.connection_status);
        setQrCodeBase64(data.qr_code_base64);
        setInstanceName(data.instance_name);
      } else {
        // Criar instância com nome baseado no email
        const newInstanceName = `instance_${user.email?.split('@')[0]}_${Date.now()}`;
        setInstanceName(newInstanceName);
      }
    } catch (error: any) {
      console.error("Error loading instance:", error);
      toast({
        title: "Erro ao carregar conexão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserInstance();

    // Configurar Realtime
    const channel = supabase
      .channel('user-instance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_instances'
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            
            // Atualizar estados locais
            if ('connection_status' in newData) {
              console.log('Updating connection_status to:', newData.connection_status);
              setConnectionStatus(newData.connection_status);
            }
            if ('qr_code_base64' in newData) {
              console.log('Updating qr_code_base64');
              setQrCodeBase64(newData.qr_code_base64);
            }

            // Mostrar toast quando conectar
            if (newData.connection_status === 'connected') {
              toast({
                title: "WhatsApp Conectado!",
                description: "Sua conta foi conectada com sucesso",
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Removing Realtime channel');
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleGenerateQR = async () => {
    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Criar ou atualizar instância
      const { error: upsertError } = await supabase
        .from("user_instances")
        .upsert({
          user_id: user.id,
          instance_name: instanceName,
          connection_status: "connecting",
          qr_code_base64: null,
        }, {
          onConflict: "user_id"
        });

      if (upsertError) throw upsertError;

      setConnectionStatus("connecting");

      // Buscar URL do webhook n8n
      const { data: configData } = await supabase
        .from("webhook_configs")
        .select("webhook_url")
        .eq("config_key", "n8n_qr_code_generator")
        .maybeSingle();

      if (!configData?.webhook_url) {
        throw new Error("URL do webhook n8n não configurada. Configure em /settings/webhooks");
      }

      // Chamar n8n
      const webhookUrl = `https://korfuodesmuvloncrpmn.supabase.co/functions/v1/evolution-webhook-receiver`;
      
      const response = await fetch(configData.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: instanceName,
          webhook: {
            url: webhookUrl,
            events: ["CONNECTION_UPDATE"]
          }
        }),
      });

      const responseData = await response.json();

      // Logar interação
      await supabase.functions.invoke("log-n8n-qr-interaction", {
        body: {
          instanceName,
          requestPayload: {
            instanceName,
            webhook: { url: webhookUrl, events: ["CONNECTION_UPDATE"] },
          },
          responseStatus: response.status,
          responseData,
        },
      });

      // Normalizar resposta (array ou objeto) e extrair base64
      let qrBase64: string | undefined;
      if (Array.isArray(responseData)) {
        qrBase64 = responseData[0]?.base64;
      } else if (responseData && typeof responseData === "object") {
        qrBase64 = (responseData as any).base64;
      }

      if (response.ok && qrBase64) {
        // Remover prefixo data URL se presente
        const base64Only = qrBase64.includes("base64,")
          ? qrBase64.split("base64,")[1]
          : qrBase64;

        // Atualizar QR Code
        await supabase
          .from("user_instances")
          .update({ qr_code_base64: base64Only })
          .eq("instance_name", instanceName);

        setQrCodeBase64(base64Only);

        toast({
          title: "QR Code gerado!",
          description: "Escaneie o código com seu WhatsApp",
        });
      } else {
        throw new Error("Resposta do n8n não contém QR Code");
      }
    } catch (error: any) {
      console.error("Error generating QR:", error);
      toast({
        title: "Erro ao gerar QR Code",
        description: error.message,
        variant: "destructive",
      });
      
      // Resetar status
      await supabase
        .from("user_instances")
        .update({ connection_status: "disconnected" })
        .eq("instance_name", instanceName);
      
      setConnectionStatus("disconnected");
    } finally {
      setProcessing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setProcessing(true);

      // Buscar URL do webhook de logout
      const { data: configData } = await supabase
        .from("webhook_configs")
        .select("webhook_url")
        .eq("config_key", "n8n_evolution_logout")
        .maybeSingle();

      if (!configData?.webhook_url) {
        throw new Error("URL do webhook de logout não configurada");
      }

      // Chamar n8n para logout
      const response = await fetch(configData.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: instanceName,
        }),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Logar tentativa de desconexão
        await supabase
          .from("evolution_logout_history")
          .insert({
            user_id: user.id,
            instance_name: instanceName,
            request_payload: { instanceName },
            response_status: response.status,
          });
      }

      toast({
        title: "Desconectando...",
        description: "Aguarde enquanto desconectamos sua instância",
      });
    } catch (error: any) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return <Badge variant="default">Conectado</Badge>;
      case "connecting":
        return <Badge variant="secondary">Conectando...</Badge>;
      default:
        return <Badge variant="destructive">Desconectado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Conexão com WhatsApp" subtitle="Gerencie a integração do seu sistema com o WhatsApp" />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Conexão com WhatsApp" 
        subtitle="Gerencie a integração do seu sistema com o WhatsApp"
      />

      <main className="container mx-auto p-4 sm:p-6 max-w-2xl"> {/* Ajustado padding */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0"> {/* Empilhado em telas pequenas */}
              <div>
                <CardTitle>Conexão com WhatsApp</CardTitle>
                <CardDescription>
                  Para enviar notificações, conecte seu número de WhatsApp.
                </CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {connectionStatus === "disconnected" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Para enviar notificações, conecte seu número de WhatsApp.
                </p>
                <Button 
                  onClick={handleGenerateQR} 
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="mr-2 h-4 w-4" />
                  )}
                  Gerar QR Code
                </Button>
              </div>
            )}

            {connectionStatus === "connecting" && qrCodeBase64 && (
              <div className="space-y-4">
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <img 
                    src={`data:image/png;base64,${qrCodeBase64}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 sm:w-80 sm:h-80 object-contain" // Ajustado tamanho para mobile
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Abra o WhatsApp no seu celular e escaneie este código
                </p>
                <Button 
                  onClick={() => {
                    setConnectionStatus("disconnected");
                    setQrCodeBase64(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            )}

            {connectionStatus === "connected" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seu WhatsApp está conectado e pronto para enviar notificações.
                </p>
                <Button 
                  onClick={handleDisconnect} 
                  disabled={processing}
                  variant="destructive"
                  className="w-full"
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="mr-2 h-4 w-4" />
                  )}
                  Desconectar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}