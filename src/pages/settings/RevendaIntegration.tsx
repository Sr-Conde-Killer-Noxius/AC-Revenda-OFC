import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { useWebhookConfig, useSaveWebhookConfig } from '@/hooks/useWebhookConfig';
import { toast } from "sonner";
import { format } from 'date-fns';
import { RevendaWebhookHistoryEntry } from '@/integrations/supabase/schema';
import { useRevendaWebhookHistory } from '@/hooks/useRevendaWebhookHistory'; // NEW: Import the dedicated hook

const SUPABASE_PROJECT_ID = 'cgqyfpsfymhntumrmbzj';
const REVENDA_WEBHOOK_LISTENER_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/revenda-webhook-listener`;

export default function RevendaIntegration() {
  const [revendaWebhookUrl, setRevendaWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Hooks para o webhook listener da Revenda
  const { data: revendaConfig, isLoading: loadingRevendaConfig } = useWebhookConfig('revenda_webhook_listener');
  const saveRevendaConfig = useSaveWebhookConfig();

  // Histórico para a tabela revenda_webhook_history
  // OLD: const { data: revendaHistory, isLoading: loadingRevendaHistory } = useWebhookHistory<RevendaWebhookHistoryEntry>('revenda_webhook_history', null);
  const { data: revendaHistory, isLoading: loadingRevendaHistory } = useRevendaWebhookHistory(); // UPDATED: Use the specific hook

  useEffect(() => {
    if (revendaConfig && !revendaWebhookUrl && !loadingRevendaConfig) {
      setRevendaWebhookUrl(revendaConfig.url);
    }
  }, [revendaConfig, revendaWebhookUrl, loadingRevendaConfig]);

  const handleCopyRevendaListenerUrl = async () => {
    await navigator.clipboard.writeText(REVENDA_WEBHOOK_LISTENER_URL);
    setCopied(true);
    toast.success('URL copiada para a área de transferência.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveRevendaWebhookUrl = () => {
    if (!revendaWebhookUrl.trim()) {
      toast.error('Por favor, insira uma URL válida para o webhook da Revenda.');
      return;
    }
    saveRevendaConfig.mutate({ type: 'revenda_webhook_listener', url: revendaWebhookUrl });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Integração Painel Revenda</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Configure a URL do webhook para receber eventos do Painel Revenda e monitore o histórico de interações.
        </p>
      </div>

      <Card className="border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Webhook Listener do Acerto Certo</CardTitle>
          <CardDescription className="text-sm">
            Esta é a URL que você deve configurar no Painel Revenda para que ele envie eventos para o Acerto Certo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">URL do Webhook (Somente Leitura)</Label>
            <div className="flex gap-2">
              <Input 
                value={REVENDA_WEBHOOK_LISTENER_URL} 
                readOnly 
                className="font-mono text-xs sm:text-sm"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCopyRevendaListenerUrl}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Configuração do Webhook de Saída (Opcional)</CardTitle>
          <CardDescription className="text-sm">
            Se o seu Painel Revenda precisa de uma URL para o Acerto Certo enviar informações, configure-a aqui.
            (Geralmente, esta seção não é necessária para o listener acima, mas pode ser útil para outras integrações).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revenda-webhook-url" className="text-sm">URL do Webhook do Painel Revenda</Label>
            <div className="flex gap-2">
              <Input 
                id="revenda-webhook-url"
                placeholder="https://seu-painel-revenda.com/webhook/..." 
                value={revendaWebhookUrl}
                onChange={(e) => setRevendaWebhookUrl(e.target.value)}
                disabled={loadingRevendaConfig}
                className="text-sm"
              />
              <Button 
                onClick={handleSaveRevendaWebhookUrl}
                disabled={saveRevendaConfig.isPending || loadingRevendaConfig}
                className="text-sm"
              >
                {saveRevendaConfig.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Histórico de Requisições (Painel Revenda → Acerto Certo)</CardTitle>
          <CardDescription className="text-sm">
            Eventos recebidos do Painel Revenda pelo listener do Acerto Certo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {loadingRevendaHistory ? (
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Data/Hora</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm">Tipo de Evento</TableHead>
                      <TableHead className="text-xs sm:text-sm">Log de Processamento</TableHead>
                      <TableHead className="text-xs sm:text-sm">Payload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revendaHistory && revendaHistory.length > 0 ? (
                      revendaHistory.map((entry: RevendaWebhookHistoryEntry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs sm:text-sm">
                            {format(new Date(entry.received_at || entry.id), 'dd/MM/yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Badge variant={entry.status_code && entry.status_code >= 200 && entry.status_code < 300 ? 'default' : 'destructive'} className="text-xs">
                              {entry.status_code || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm font-medium">
                            {entry.event_type || 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-xs truncate">
                            {entry.processing_log || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-md truncate">
                            {JSON.stringify(entry.payload)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
                          Nenhum evento registrado ainda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}