import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy as CopyIcon, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestPayload: any;
  responsePayload: any;
  errorMessage?: string | null;
}

export const WebhookDetailsDialog: React.FC<WebhookDetailsDialogProps> = ({
  open,
  onOpenChange,
  requestPayload,
  responsePayload,
  errorMessage,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copiado!`);
    }).catch((err: Error) => { // Explicitly type 'err' as Error
      toast.error(`Falha ao copiar ${label}.`);
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Falha do Webhook</DialogTitle>
          <DialogDescription>
            Informações detalhadas sobre a requisição e resposta do webhook.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {errorMessage && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              <p className="font-medium">Mensagem de Erro:</p>
              <p>{errorMessage}</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center justify-between">
              Payload da Requisição
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(requestPayload, null, 2), 'Payload da Requisição')}
              >
                <CopyIcon className="h-4 w-4 mr-2" /> Copiar
              </Button>
            </h3>
            <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-x-auto max-h-60">
              <code>{JSON.stringify(requestPayload, null, 2)}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center justify-between">
              Payload da Resposta
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(responsePayload, null, 2), 'Payload da Resposta')}
              >
                <CopyIcon className="h-4 w-4 mr-2" /> Copiar
              </Button>
            </h3>
            <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-x-auto max-h-60">
              <code>{JSON.stringify(responsePayload, null, 2)}</code>
            </pre>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <XIcon className="h-4 w-4 mr-2" /> Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};