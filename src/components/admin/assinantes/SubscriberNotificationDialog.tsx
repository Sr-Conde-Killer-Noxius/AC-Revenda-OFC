import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  UserWithDetails,
  useN8nMessageSenderUrl,
  useSendSubscriberMessageWebhook,
  useSubscriberTemplates, // NOVO: Importar useSubscriberTemplates
} from '@/hooks/useSubscriberManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useProfileData'; // NOVO: Importar useUserProfile para a chave PIX
import { format } from 'date-fns'; // NOVO: Importar format para datas

interface SubscriberNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriber: UserWithDetails | null; // Agora é obrigatório, pois é para um assinante específico
}

export function SubscriberNotificationDialog({ open, onOpenChange, subscriber }: SubscriberNotificationDialogProps) {
  const { user: currentUser } = useAuth();
  const { data: subscriberTemplates, isLoading: isLoadingTemplates, error: templatesError } = useSubscriberTemplates(); // NOVO: Hook para templates de assinantes
  const { data: n8nWebhookUrl, isLoading: isLoadingWebhookUrl, error: webhookUrlError } = useN8nMessageSenderUrl();
  const { data: adminUserProfile, isLoading: isLoadingAdminProfile, error: adminProfileError } = useUserProfile(); // NOVO: Perfil do admin para a chave PIX
  const sendNotificationMutation = useSendSubscriberMessageWebhook();

  const [content, setContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSelectOpen, setTemplateSelectOpen] = useState(false);

  useEffect(() => {
    if (open) {
      // Resetar estados ao abrir o diálogo
      setContent('');
      setSelectedTemplateId(null);
    }
  }, [open]);

  useEffect(() => {
    if (templatesError) {
      toast.error("Erro ao carregar templates", { description: templatesError.message });
    }
    if (webhookUrlError) {
      toast.error("Erro ao carregar URL do webhook", { description: webhookUrlError.message });
    }
    if (adminProfileError) {
      toast.error("Erro ao carregar perfil do administrador", { description: adminProfileError.message });
    }
  }, [templatesError, webhookUrlError, adminProfileError]);

  // Efeito para preencher o conteúdo quando um template é selecionado
  useEffect(() => {
    if (selectedTemplateId && subscriberTemplates) {
      const template = subscriberTemplates.find(t => t.id === selectedTemplateId);
      if (template) {
        setContent(template.content);
      }
    } else {
      setContent('');
    }
  }, [selectedTemplateId, subscriberTemplates]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplateSelectOpen(false);
  };

  const handleSendNotification = async () => {
    if (!subscriber) {
      toast.error("Erro", { description: "Nenhum assinante selecionado para notificar." });
      return;
    }
    if (!selectedTemplateId) {
      toast.error("Erro", { description: "Por favor, selecione um template de mensagem." });
      return;
    }
    if (!content.trim()) {
      toast.error("Erro", { description: "O conteúdo da mensagem não pode estar vazio." });
      return;
    }
    if (!n8nWebhookUrl) {
      toast.error("Erro", { description: "URL de envio de mensagens não configurada. Configure em Conexão > Webhooks." });
      return;
    }
    if (isLoadingAdminProfile) {
      toast.error("Erro", { description: "Carregando dados do perfil do administrador. Por favor, tente novamente." });
      return;
    }

    try {
      // --- Lógica de Substituição de Variáveis ---
      let renderedText = content;

      // Dados do assinante
      renderedText = renderedText.replaceAll('{{subscriber_name}}', subscriber.name || 'Assinante');
      renderedText = renderedText.replaceAll('{{subscriber_email}}', subscriber.email || 'N/A');
      
      // Dados da assinatura do assinante
      if (subscriber.subscription) {
        renderedText = renderedText.replaceAll('{{plan_name}}', subscriber.subscription.plan_name || 'Plano Desconhecido');
        renderedText = renderedText.replaceAll('{{plan_price}}', subscriber.subscription.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        if (subscriber.subscription.next_billing_date) {
          const nextBillingDate = new Date(subscriber.subscription.next_billing_date + 'T00:00:00');
          renderedText = renderedText.replaceAll('{{next_billing_date}}', format(nextBillingDate, 'dd/MM/yyyy'));
        } else {
          renderedText = renderedText.replaceAll('{{next_billing_date}}', 'N/A');
        }
      } else {
        renderedText = renderedText.replaceAll('{{plan_name}}', 'Sem Plano');
        renderedText = renderedText.replaceAll('{{plan_price}}', 'R$ 0,00');
        renderedText = renderedText.replaceAll('{{next_billing_date}}', 'N/A');
      }

      // Chave PIX do administrador logado
      renderedText = renderedText.replaceAll('{{pix_key}}', adminUserProfile?.pix_key || 'Chave PIX não cadastrada');
      // --- Fim Lógica de Substituição de Variáveis ---

      await sendNotificationMutation.mutateAsync({
        n8nWebhookUrl,
        subscriber,
        templateId: selectedTemplateId,
        renderedTextContent: renderedText,
      });

      toast.success("Mensagem enviada!", { description: `A mensagem para ${subscriber.name} foi enviada com sucesso.` });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro técnico ao enviar mensagem para assinante:", error);
      toast.error("Erro ao enviar mensagem", { description: error.message });
    }
  };

  const isLoading = isLoadingTemplates || isLoadingWebhookUrl || isLoadingAdminProfile || sendNotificationMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Mensagem ao Assinante</DialogTitle>
          <DialogDescription>
            Envie uma mensagem via WhatsApp para {subscriber?.name || "o assinante"}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {subscriber && (
            <p className="text-sm text-muted-foreground">
              Destinatário: <span className="font-medium text-foreground">{subscriber.name} ({subscriber.email})</span>
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="template">Usar Template</Label>
            <Popover open={templateSelectOpen} onOpenChange={setTemplateSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={templateSelectOpen}
                  className="w-full justify-between"
                  disabled={isLoadingTemplates || isLoading}
                >
                  {selectedTemplateId
                    ? subscriberTemplates?.find((template) => template.id === selectedTemplateId)?.name
                    : "Selecionar template..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Buscar template..." />
                  <CommandList>
                    {isLoadingTemplates ? (
                      <CommandEmpty>Carregando templates...</CommandEmpty>
                    ) : (subscriberTemplates || []).length === 0 ? (
                      <CommandEmpty>Nenhum template encontrado.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {(subscriberTemplates || []).map((template) => (
                          <CommandItem
                            key={template.id}
                            value={template.name}
                            onSelect={() => handleTemplateSelect(template.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedTemplateId === template.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {template.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">Conteúdo da Mensagem</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O conteúdo do template será carregado aqui. Você pode editá-lo."
              rows={8}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Placeholders disponíveis: {"{{subscriber_name}}"}, {"{{subscriber_email}}"}, {"{{plan_name}}"}, {"{{plan_price}}"}, {"{{next_billing_date}}"}, {"{{pix_key}}"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSendNotification} disabled={isLoading || !selectedTemplateId || !content.trim()}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bell className="mr-2 h-4 w-4" />
            )}
            Enviar Mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}