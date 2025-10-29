import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { useWebhookConfig, useSaveWebhookConfig } from '@/hooks/useWebhookConfig';
import { useWebhookHistory } from '@/hooks/useWebhookHistory';
import { toast } from "sonner";
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvolutionApiHistoryEntry, N8nQrCodeHistoryEntry, N8nMessageSenderHistoryEntry, EvolutionLogoutHistoryEntry } from '@/integrations/supabase/schema';

const SUPABASE_PROJECT_ID = 'cgqyfpsfymhntumrmbzj';
const EVOLUTION_WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/evolution-webhook-receiver`;

export default function Webhooks() {
  const [n8nQrUrl, setN8nQrUrl] = useState('');
  const [n8nMessageSenderUrl, setN8nMessageSenderUrl] = useState('');
  const [n8nEvolutionLogoutUrl, setN8nEvolutionLogoutUrl] = useState(''); // NOVO: Estado para URL de logout
  const [copied, setCopied] = useState(false);

  // Hooks para o webhook de QR Code
  const { data: n8nQrConfig, isLoading: loadingN8nQr } = useWebhookConfig('n8n_qr_code_generator');
  const saveN8nQrConfig = useSaveWebhookConfig();

  // Hooks para o novo webhook de envio de mensagens
  const { data: n8nMessageSenderConfig, isLoading: loadingN8nMessageSender } = useWebhookConfig('n8n_message_sender');
  const saveN8nMessageSenderConfig = useSaveWebhookConfig();

  // NOVO: Hooks para o webhook de logout da Evolution API
  const { data: n8nEvolutionLogoutConfig, isLoading: loadingN8nEvolutionLogout } = useWebhookConfig('n8n_evolution_logout');
  const saveN8nEvolutionLogoutConfig = useSaveWebhookConfig();

  // Históricos separados para cada tabela, com tipos genéricos explícitos
  const { data: evolutionHistory, isLoading: loadingEvolutionHistory } = useWebhookHistory<EvolutionApiHistoryEntry>('evolution_api_history', null);
  const { data: n8nQrCodeHistory, isLoading: loadingN8nQrCodeHistory } = useWebhookHistory<N8nQrCodeHistoryEntry>('n8n_qr_code_history', 'n8n_outbound_qr');
  const { data: n8nMessageSenderHistory, isLoading: loadingN8nMessageSenderHistory } = useWebhookHistory<N8nMessageSenderHistoryEntry>('n8n_message_sender_history', ['n8n_message_outbound', 'n8n_message_outbound_automated']);
  const { data: evolutionLogoutHistory, isLoading: loadingEvolutionLogoutHistory } = useWebhookHistory<EvolutionLogoutHistoryEntry>('evolution_logout_history', 'n8n_evolution_logout_outbound'); // NOVO: Histórico de logout


  useEffect(() => {
    if (n8nQrConfig && !n8nQrUrl && !loadingN8nQr) {
      setN8nQrUrl(n8nQrConfig.url);
    }
  }, [n8nQrConfig, n8nQrUrl, loadingN8nQr]);

  useEffect(() => {
    if (n8nMessageSenderConfig && !n8nMessageSenderUrl && !loadingN8nMessageSender) {
      setN8nMessageSenderUrl(n8nMessageSenderConfig.url);
    }
  }, [n8nMessageSenderConfig, n8nMessageSenderUrl, loadingN8nMessageSender]);

  // NOVO: Efeito para carregar a URL do webhook de logout
  useEffect(() => {
    if (n8nEvolutionLogoutConfig && !n8nEvolutionLogoutUrl && !loadingN8nEvolutionLogout) {
      setN8nEvolutionLogoutUrl(n8nEvolutionLogoutConfig.url);
    }
  }, [n8nEvolutionLogoutConfig, n8nEvolutionLogoutUrl, loadingN8nEvolutionLogout]);


  const handleCopyEvolutionUrl = async () => {
    await navigator.clipboard.writeText(EVOLUTION_WEBHOOK_URL);
    setCopied(true);
    toast.success('URL copiada para a área de transferência.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveN8nQrUrl = () => {
    if (!n8nQrUrl.trim()) {
      toast.error('URL Inválida', { description: 'A URL do webhook para QR Code não pode estar vazia. Por favor, insira uma URL válida.' });
      return;
    }
    saveN8nQrConfig.mutate({ type: 'n8n_qr_code_generator', url: n8nQrUrl });
  };

  const handleSaveN8nMessageSenderUrl = () => {
    if (!n8nMessageSenderUrl.trim()) {
      toast.error('URL Inválida', { description: 'A URL do webhook para envio de mensagens não pode estar vazia. Por favor, insira uma URL válida.' });
      return;
    }
    saveN8nMessageSenderConfig.mutate({ type: 'n8n_message_sender', url: n8nMessageSenderUrl });
  };

  // NOVO: Handler para salvar a URL do webhook de logout
  const handleSaveN8nEvolutionLogoutUrl = () => {
    if (!n8nEvolutionLogoutUrl.trim()) {
      toast.error('URL Inválida', { description: 'A URL do webhook para logout da Evolution API não pode estar vazia. Por favor, insira uma URL válida.' });
      return;
    }
    saveN8nEvolutionLogoutConfig.mutate({ type: 'n8n_evolution_logout', url: n8nEvolutionLogoutUrl });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configuração de Webhooks</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie as URLs de webhooks e monitore o histórico de eventos</p>
      </div>

      <Tabs defaultValue="evolution-api" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="evolution-api" className="text-sm">Evolution API</TabsTrigger>
          <TabsTrigger value="n8n-qr-code" className="text-sm">N8N QR Code</TabsTrigger>
          <TabsTrigger value="n8n-message-sender" className="text-sm">N8N Mensagens</TabsTrigger>
          <TabsTrigger value="evolution-logout" className="text-sm">Evolution Logout (N8N)</TabsTrigger>
        </TabsList>

        {/* Seção: Webhook da Evolution API */}
        <TabsContent value="evolution-api">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Webhook da Evolution API</CardTitle>
              <CardDescription className="text-sm">
                URL pública para receber atualizações de status da Evolution API. Configure esta URL na Evolution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">URL do Webhook (Somente Leitura)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={EVOLUTION_WEBHOOK_URL} 
                    readOnly 
                    className="font-mono text-xs sm:text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyEvolutionUrl}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Histórico de Requisições (Evolution → Sistema)</h3>
                {loadingEvolutionHistory ? (
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Data/Hora</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Tipo de Evento</TableHead>
                          <TableHead className="text-xs sm:text-sm">Payload</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evolutionHistory && evolutionHistory.length > 0 ? (
                          evolutionHistory.map((entry: EvolutionApiHistoryEntry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="text-xs sm:text-sm">
                                {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <Badge variant={entry.status_code && entry.status_code >= 200 && entry.status_code < 300 ? 'default' : 'destructive'} className="text-xs">
                                  {entry.status_code || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm font-medium">
                                {entry.webhook_type}
                              </TableCell>
                              <TableCell className="font-mono text-xs max-w-md truncate">
                                {JSON.stringify(entry.payload)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
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
        </TabsContent>

        {/* Seção: Webhook de Geração de QR Code (N8N) */}
        <TabsContent value="n8n-qr-code">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Webhook de Geração de QR Code (N8N)</CardTitle>
              <CardDescription className="text-sm">
                Configure a URL do webhook do n8n responsável por gerar o QR Code de conexão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="n8n-qr-url" className="text-sm">URL do Webhook n8n</Label>
                <div className="flex gap-2">
                  <Input 
                    id="n8n-qr-url"
                    placeholder="https://seu-n8n.com/webhook/..." 
                    value={n8nQrUrl}
                    onChange={(e) => setN8nQrUrl(e.target.value)}
                    disabled={loadingN8nQr}
                    className="text-sm"
                  />
                  <Button 
                    onClick={handleSaveN8nQrUrl}
                    disabled={saveN8nQrConfig.isPending || loadingN8nQr}
                    className="text-sm"
                  >
                    {saveN8nQrConfig.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Histórico de Requisições (Sistema → n8n QR)</h3>
                {loadingN8nQrCodeHistory ? (
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Data/Hora</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Payload</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {n8nQrCodeHistory && n8nQrCodeHistory.length > 0 ? (
                          n8nQrCodeHistory.map((entry: N8nQrCodeHistoryEntry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="text-xs sm:text-sm">
                                {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <Badge variant={entry.status_code && entry.status_code >= 200 && entry.status_code < 300 ? 'default' : 'destructive'} className="text-xs">
                                  {entry.status_code || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs max-w-md truncate">
                                {JSON.stringify(entry.payload)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground text-sm">
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
        </TabsContent>

        {/* Seção: Webhook de Envio de Mensagem (N8N) */}
        <TabsContent value="n8n-message-sender">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Webhook de Envio de Mensagem (N8N)</CardTitle>
              <CardDescription className="text-sm">
                Configure a URL do webhook do n8n responsável por enviar mensagens de WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="n8n-message-sender-url" className="text-sm">URL do Webhook n8n</Label>
                <div className="flex gap-2">
                  <Input 
                    id="n8n-message-sender-url"
                    placeholder="https://seu-n8n.com/webhook/..." 
                    value={n8nMessageSenderUrl}
                    onChange={(e) => setN8nMessageSenderUrl(e.target.value)}
                    disabled={loadingN8nMessageSender}
                    className="text-sm"
                  />
                  <Button 
                    onClick={handleSaveN8nMessageSenderUrl}
                    disabled={saveN8nMessageSenderConfig.isPending || loadingN8nMessageSender}
                    className="text-sm"
                  >
                    {saveN8nMessageSenderConfig.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Histórico de Requisições (Sistema → n8n Mensagem)</h3>
                {loadingN8nMessageSenderHistory ? (
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Data/Hora</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Payload</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {n8nMessageSenderHistory && n8nMessageSenderHistory.length > 0 ? (
                          n8nMessageSenderHistory.map((entry: N8nMessageSenderHistoryEntry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="text-xs sm:text-sm">
                                {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <Badge variant={entry.status_code && entry.status_code >= 200 && entry.status_code < 300 ? 'default' : 'destructive'} className="text-xs">
                                  {entry.status_code || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs max-w-md truncate">
                                {JSON.stringify(entry.payload)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground text-sm">
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
        </TabsContent>

        {/* NOVO: Seção: Webhook de Logout da Evolution API (N8N) */}
        <TabsContent value="evolution-logout">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Webhook de Logout da Evolution API (N8N)</CardTitle>
              <CardDescription className="text-sm">
                Configure a URL do webhook do n8n responsável por desconectar a instância da Evolution API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="n8n-evolution-logout-url" className="text-sm">URL do Webhook n8n</Label>
                <div className="flex gap-2">
                  <Input 
                    id="n8n-evolution-logout-url"
                    placeholder="https://seu-n8n.com/webhook/logout-evolution-api..." 
                    value={n8nEvolutionLogoutUrl}
                    onChange={(e) => setN8nEvolutionLogoutUrl(e.target.value)}
                    disabled={loadingN8nEvolutionLogout}
                    className="text-sm"
                  />
                  <Button 
                    onClick={handleSaveN8nEvolutionLogoutUrl}
                    disabled={saveN8nEvolutionLogoutConfig.isPending || loadingN8nEvolutionLogout}
                    className="text-sm"
                  >
                    {saveN8nEvolutionLogoutConfig.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Histórico de Requisições (Sistema → n8n Logout)</h3>
                {loadingEvolutionLogoutHistory ? (
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Data/Hora</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Payload</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evolutionLogoutHistory && evolutionLogoutHistory.length > 0 ? (
                          evolutionLogoutHistory.map((entry: EvolutionLogoutHistoryEntry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="text-xs sm:text-sm">
                                {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <Badge variant={entry.status_code && entry.status_code >= 200 && entry.status_code < 300 ? 'default' : 'destructive'} className="text-xs">
                                  {entry.status_code || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs max-w-md truncate">
                                {JSON.stringify(entry.payload)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground text-sm">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}