import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTemplates, Template } from "@/hooks/useTemplates"; // Importar Template do hook useTemplates
import { Client } from "@/hooks/useClients"; // Importar Client do hook useClients
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Importar useQueryClient
import { useUserProfile } from "@/hooks/useProfileData"; // NOVO: Importar useUserProfile

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null; // Usar o tipo Client atualizado
}

// Hook para buscar a URL do webhook de envio de mensagens
const fetchN8nMessageSenderUrl = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('webhook_configs')
    .select('url')
    // .eq('user_id', user.id) // REMOVIDO: Este filtro impedia usuários comuns de verem webhooks configurados por admins
    .eq('type', 'n8n_message_sender')
    .maybeSingle();

  if (error) throw error;
  return data?.url || null;
};

// Hook de mutação para enviar a mensagem via webhook
interface SendMessagePayload {
  n8nWebhookUrl: string;
  client: Client;
  templateId: string; // Adicionado templateId
  renderedTextContent: string; // Adicionado para o texto já processado
}

const sendMessageViaWebhook = async ({ n8nWebhookUrl, client, templateId, renderedTextContent }: SendMessagePayload) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // --- NOVO: Buscar o instanceName do usuário ---
  const { data: userInstance, error: instanceError } = await supabase
    .from('user_instances')
    .select('instance_name')
    .eq('user_id', user.id)
    .single();

  if (instanceError || !userInstance?.instance_name) {
    throw new Error('Nenhuma instância do WhatsApp configurada para o seu usuário. Por favor, conecte seu WhatsApp em "Conexão > WhatsApp".');
  }
  const instanceName = userInstance.instance_name;
  // --- FIM NOVO: Buscar o instanceName do usuário ---

  const requestBody = {
    body: [
      {
        instanceName: instanceName, // --- NOVO: Adicionado o instanceName aqui ---
        contact_name: client.name,
        number: client.phone, // Assumindo que o formato já é adequado para WhatsApp
        text: renderedTextContent, // Usar o texto com variáveis substituídas
        mode: "real"
      }
    ]
  };

  let statusCode: number | null = null;
  let responsePayload: any = null;
  let errorMessage: string | null = null; // Variável para armazenar a mensagem de erro

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    statusCode = response.status;
    
    // Tenta ler o corpo da resposta como JSON, se falhar, lê como texto
    try {
      responsePayload = await response.json();
    } catch (jsonError) {
      responsePayload = await response.text();
      console.warn("Webhook response was not JSON, read as text.", jsonError);
    }

    if (!response.ok) {
      // Se a resposta não for OK, extrai a mensagem de erro do payload ou usa o statusText
      errorMessage = responsePayload?.message || response.statusText || `O servidor de automação retornou um erro com status ${statusCode}.`;
      throw new Error(errorMessage || 'An unknown error occurred during webhook processing.'); // Corrigido: Garante que a mensagem seja string
    }

    return { success: true, statusCode };

  } catch (error: any) {
    // Captura o erro e armazena a mensagem para o log
    errorMessage = error.message;
    console.error("Erro ao enviar mensagem via webhook:", error); // Loga o erro técnico completo
    throw new Error(errorMessage || 'An unknown error occurred.'); // Garante que a mensagem seja string
  } finally {
    // Registrar no histórico de webhooks na nova tabela
    await supabase
      .from('n8n_message_sender_history') // Alterado para a nova tabela
      .insert({
        user_id: user.id,
        client_id: client.id, // Adicionado client_id
        template_id: templateId, // Adicionado template_id
        webhook_type: 'n8n_message_outbound', // Tipo para envios manuais
        payload: requestBody,
        request_payload: requestBody,
        response_payload: responsePayload,
        status_code: statusCode,
        client_name_snapshot: client.name, // Snapshot do nome do cliente
      });
  }
};

export const useSendMessageWebhook = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, SendMessagePayload>({
    mutationFn: sendMessageViaWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookHistory', 'n8n_message_sender_history', 'n8n_message_outbound'] });
      queryClient.invalidateQueries({ queryKey: ['webhookHistory', 'n8n_message_sender_history', 'n8n_message_outbound_automated'] });
    },
  });
};


export function NotificationDialog({ open, onOpenChange, client }: NotificationDialogProps) {
  const { data: templates, isLoading: isLoadingTemplates, error: templatesError } = useTemplates();
  const { data: n8nMessageSenderUrl, isLoading: isLoadingN8nUrl, error: n8nUrlError } = useQuery<string | null, Error>({
    queryKey: ['n8nMessageSenderUrl'],
    queryFn: fetchN8nMessageSenderUrl,
  });
  const { data: userProfile, isLoading: isLoadingUserProfile, error: userProfileError } = useUserProfile(); // NOVO: Buscar dados do perfil do usuário
  const sendMessageMutation = useSendMessageWebhook();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTemplateId(""); // Resetar seleção ao abrir
    }
  }, [open]);

  useEffect(() => {
    if (templatesError) {
      console.error("Erro técnico ao carregar templates:", templatesError); // Loga o erro técnico
      toast.error("Erro ao carregar templates", { description: "Não foi possível carregar os templates de mensagem. Tente novamente." });
    }
  }, [templatesError]);

  useEffect(() => {
    if (n8nUrlError) {
      console.error("Erro técnico ao carregar URL do webhook:", n8nUrlError); // Loga o erro técnico
      toast.error("Erro ao carregar URL do webhook", { description: "Não foi possível carregar a URL de envio de mensagens. Verifique as configurações de webhook." });
    }
  }, [n8nUrlError]);

  // NOVO: Efeito para erros no perfil do usuário
  useEffect(() => {
    if (userProfileError) {
      console.error("Erro técnico ao carregar perfil do usuário:", userProfileError);
      toast.error("Erro ao carregar perfil do usuário", { description: "Não foi possível carregar os dados do seu perfil. Tente novamente." });
    }
  }, [userProfileError]);

  const handleSendNotification = async () => {
    setLoading(true);
    try {
      if (!client) {
        throw new Error("Nenhum cliente selecionado para notificar.");
      }
      if (!selectedTemplateId) {
        throw new Error("Por favor, selecione um template de mensagem.");
      }
      if (!n8nMessageSenderUrl) {
        throw new Error("URL de envio de mensagens não configurada. Configure em Conexão > Webhooks.");
      }
      if (isLoadingUserProfile) {
        throw new Error("Carregando dados do perfil do usuário. Por favor, tente novamente.");
      }

      const selectedTemplate = (templates || []).find((t: Template) => t.id === selectedTemplateId);
      if (!selectedTemplate) {
        throw new Error("Template selecionado não encontrado.");
      }

      // --- Lógica de Substituição de Variáveis ---
      let renderedText = selectedTemplate.content;

      // Substituir nome do cliente
      renderedText = renderedText.replaceAll('{{customer_name}}', client.name);
      
      // Formatar a data de vencimento para o padrão brasileiro (dd/mm/aaaa)
      // client.next_billing_date é uma string 'YYYY-MM-DD'
      const dueDate = new Date(client.next_billing_date + 'T00:00:00'); // Tratar como data local para evitar problemas de fuso horário
      renderedText = renderedText.replaceAll('{{due_date}}', dueDate.toLocaleDateString('pt-BR')); 
      
      // Substituir nome do plano (usando planDetailsName do tipo Client estendido)
      renderedText = renderedText.replaceAll('{{plan_name}}', client.planDetailsName || 'Plano Desconhecido'); 
      
      // Formatar o valor como moeda brasileira (R$)
      renderedText = renderedText.replaceAll('{{value}}', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.value)); 

      // NOVO: Substituir chave PIX do usuário logado
      renderedText = renderedText.replaceAll('{{pix_key}}', userProfile?.pix_key || 'Chave PIX não cadastrada');

      await sendMessageMutation.mutateAsync({
        n8nWebhookUrl: n8nMessageSenderUrl,
        client,
        templateId: selectedTemplateId, // Passar o ID do template
        renderedTextContent: renderedText, // Passar o texto já processado
      });

      toast.success("Notificação enviada!", { description: `A mensagem para ${client.name} foi enviada com sucesso.` });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro técnico ao enviar notificação:", error); // Loga o erro técnico completo
      toast.error("Erro ao enviar notificação", { description: "Não foi possível enviar a notificação. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  const isSending = loading || sendMessageMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notificar Cliente</DialogTitle>
          <DialogDescription>
            Envie uma mensagem via WhatsApp para {client?.name || "o cliente"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {client && (
            <p className="text-sm text-muted-foreground">
              Destinatário: <span className="font-medium text-foreground">{client.name}</span>
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="template-select">Escolha o template da mensagem *</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isLoadingTemplates || isSending || isLoadingUserProfile}>
              <SelectTrigger id="template-select">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTemplates || isLoadingUserProfile ? (
                  <SelectItem value="loading" disabled>Carregando templates...</SelectItem>
                ) : (templates || []).length === 0 ? (
                  <SelectItem value="no-templates" disabled>
                    Nenhum template disponível
                  </SelectItem>
                ) : (
                  (templates || []).map((template: Template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSendNotification} disabled={isSending || !selectedTemplateId || isLoadingN8nUrl || !n8nMessageSenderUrl || isLoadingUserProfile}>
            {isSending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}