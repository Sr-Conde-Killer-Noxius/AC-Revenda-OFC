import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Clock, Send, FileText, Calendar, User, X, Info, UserCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { WebhookDetailsDialog } from '@/components/connection/WebhookDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';

// Define interface for history items (for the main dashboard history)
interface HistoryItem {
  id: string;
  clientName: string;
  templateName: string;
  sentDate: string;
  status: 'success' | 'failed';
  creatorName?: string; // Adicionado para a visão de admin
}

// Define interface for detailed items (for the clickable table)
interface DetailedHistoryItem {
  id: string;
  clientName: string;
  templateName: string;
  eventDate: string; // This will be send_at or sent_at
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string | null;
  requestPayload?: any | null;
  responsePayload?: any | null;
  creatorName?: string; // Adicionado para a visão de admin
}

interface ConnectionMetricsData {
  metrics: {
    sent: number;
    scheduled: number;
    failed: number;
  };
  history: HistoryItem[];
}

// --- LÓGICA DE BUSCA DE DADOS (EXISTENTE - VIA EDGE FUNCTION) ---
const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
const EDGE_FUNCTION_NAME = "connection-metrics";
const EDGE_FUNCTION_BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

const fetchConnectionMetrics = async (): Promise<ConnectionMetricsData> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const response = await fetch(EDGE_FUNCTION_BASE_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar métricas de conexão.");
  }

  return response.json();
};

const fetchDetailedMetrics = async (status: 'pending' | 'success' | 'failed'): Promise<{ detailedData: DetailedHistoryItem[] }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const response = await fetch(`${EDGE_FUNCTION_BASE_URL}?status=${status}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Erro ao buscar detalhes de ${status}.`);
  }

  return response.json();
};

// --- NOVAS FUNÇÕES DE BUSCA DE DADOS (DIRETA - PARA ADMINS) ---
const fetchAdminConnectionMetricsDirect = async (): Promise<ConnectionMetricsData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  // Fetch sent history (only direct columns)
  const { data: sentHistory, error: sentError } = await supabase
    .from('n8n_message_sender_history')
    .select(`id, status_code, timestamp, client_id, template_id, user_id, client_name_snapshot`)
    .order('timestamp', { ascending: false });

  if (sentError) throw new Error(sentError.message);

  // Fetch scheduled notifications (only direct columns)
  const { data: scheduledNotifications, error: scheduledError } = await supabase
    .from('scheduled_notifications')
    .select(`id, status, send_at, client_id, template_id, user_id, client_name_snapshot`) // AGORA INCLUI client_name_snapshot
    .eq('status', 'pending')
    .order('send_at', { ascending: true });

  if (scheduledError) throw new Error(scheduledError.message);

  // Collect all unique IDs for lookup
  const uniqueClientIds = [...new Set([
    ...sentHistory.map(entry => entry.client_id),
    ...scheduledNotifications.map(entry => entry.client_id)
  ].filter(Boolean))] as string[];

  const uniqueTemplateIds = [...new Set([
    ...sentHistory.map(entry => entry.template_id),
    ...scheduledNotifications.map(entry => entry.template_id)
  ].filter(Boolean))] as string[];

  const uniqueUserIds = [...new Set([
    ...sentHistory.map(entry => entry.user_id),
    ...scheduledNotifications.map(entry => entry.user_id)
  ].filter(Boolean))] as string[];

  // Fetch names separately
  const { data: clientNames, error: clientNamesError } = await supabase.from('clients').select('id, name').in('id', uniqueClientIds);
  const { data: templateNames, error: templateNamesError } = await supabase.from('templates').select('id, name').in('id', uniqueTemplateIds);
  const { data: profileNames, error: profileNamesError } = await supabase.from('profiles').select('id, name').in('id', uniqueUserIds);

  if (clientNamesError) console.warn("Erro ao buscar nomes de clientes:", clientNamesError.message);
  if (templateNamesError) console.warn("Erro ao buscar nomes de templates:", templateNamesError.message);
  if (profileNamesError) console.warn("Erro ao buscar nomes de perfis:", profileNamesError.message);

  const clientMap = new Map(clientNames?.map(c => [c.id, c.name]) || []);
  const templateMap = new Map(templateNames?.map(t => [t.id, t.name]) || []);
  const profileMap = new Map(profileNames?.map(p => [p.id, p.name]) || []);

  let sentCount = 0;
  let failedCount = 0;
  const history: HistoryItem[] = [];

  sentHistory.forEach(entry => {
    const isSuccess = entry.status_code && entry.status_code >= 200 && entry.status_code < 300;
    if (isSuccess) {
      sentCount++;
    } else {
      failedCount++;
    }

    let clientName: string;
    const clientFromMap = entry.client_id ? clientMap.get(entry.client_id) : undefined;

    if (clientFromMap) {
      clientName = clientFromMap;
    } else {
      // Client is either deleted or client_id is null/invalid.
      // Prioritize client_name_snapshot if it exists and is not an empty string, otherwise use 'Cliente'.
      const nameToDisplay = (entry.client_name_snapshot && entry.client_name_snapshot.trim() !== '')
        ? entry.client_name_snapshot
        : 'Cliente';
      clientName = `${nameToDisplay} (deletado)`;
    }

    if (history.length < 10) {
      history.push({
        id: entry.id,
        clientName: clientName,
        templateName: entry.template_id ? templateMap.get(entry.template_id) || 'Desconhecido' : 'Desconhecido',
        sentDate: new Date(entry.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: isSuccess ? 'success' : 'failed',
        creatorName: entry.user_id ? profileMap.get(entry.user_id) || 'Desconhecido' : 'Desconhecido',
      });
    }
  });

  const scheduledCount = scheduledNotifications.length;

  return {
    metrics: {
      sent: sentCount,
      scheduled: scheduledCount,
      failed: failedCount,
    },
    history: history,
  };
};

const fetchAdminDetailedMetricsDirect = async (status: 'pending' | 'success' | 'failed'): Promise<{ detailedData: DetailedHistoryItem[] }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  let rawEntries: any[] = [];

  if (status === 'pending') {
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select(`id, status, send_at, client_id, template_id, user_id, client_name_snapshot`) // AGORA INCLUI client_name_snapshot
      .eq('status', 'pending')
      .order('send_at', { ascending: true });
    if (error) throw new Error(error.message);
    rawEntries = data;
  } else { // 'success' or 'failed'
    const { data, error } = await supabase
      .from('n8n_message_sender_history')
      .select(`id, status_code, timestamp, request_payload, response_payload, client_id, template_id, user_id, client_name_snapshot`)
      .order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    rawEntries = data.filter(entry => {
      const isSuccess = entry.status_code && entry.status_code >= 200 && entry.status_code < 300;
      return (status === 'success' && isSuccess) || (status === 'failed' && !isSuccess);
    });
  }

  // Collect all unique IDs for lookup from rawEntries
  const uniqueClientIds = [...new Set(rawEntries.map(entry => entry.client_id).filter(Boolean))] as string[];
  const uniqueTemplateIds = [...new Set(rawEntries.map(entry => entry.template_id).filter(Boolean))] as string[];
  const uniqueUserIds = [...new Set(rawEntries.map(entry => entry.user_id).filter(Boolean))] as string[];

  // Fetch names separately
  const { data: clientNames, error: clientNamesError } = await supabase.from('clients').select('id, name').in('id', uniqueClientIds);
  const { data: templateNames, error: templateNamesError } = await supabase.from('templates').select('id, name').in('id', uniqueTemplateIds);
  const { data: profileNames, error: profileNamesError } = await supabase.from('profiles').select('id, name').in('id', uniqueUserIds);

  if (clientNamesError) console.warn("Erro ao buscar nomes de clientes:", clientNamesError.message);
  if (templateNamesError) console.warn("Erro ao buscar nomes de templates:", templateNamesError.message);
  if (profileNamesError) console.warn("Erro ao buscar nomes de perfis:", profileNamesError.message);

  const clientMap = new Map(clientNames?.map(c => [c.id, c.name]) || []);
  const templateMap = new Map(templateNames?.map(t => [t.id, t.name]) || []);
  const profileMap = new Map(profileNames?.map(p => [p.id, p.name]) || []);

  const detailedData: DetailedHistoryItem[] = rawEntries.map(entry => {
    let errorMessage: string | null = null;
    // Tenta extrair a mensagem de erro do response_payload se for um objeto e tiver uma propriedade 'message'
    if (entry.response_payload && typeof entry.response_payload === 'object' && 'message' in entry.response_payload) {
      errorMessage = (entry.response_payload as { message: string }).message;
    } else if (entry.response_payload && typeof entry.response_payload === 'string') {
      // Se for uma string, usa a própria string como mensagem de erro
      errorMessage = entry.response_payload;
    } else if (status === 'failed') {
      // Se for uma falha e não houver mensagem específica, usa uma genérica
      errorMessage = "Erro desconhecido ao enviar mensagem.";
    }

    let clientName: string;
    const clientFromMap = entry.client_id ? clientMap.get(entry.client_id) : undefined;

    if (clientFromMap) {
      clientName = clientFromMap;
    } else {
      // Client is either deleted or client_id is null/invalid.
      // Prioritize client_name_snapshot if it exists and is not an empty string, otherwise use 'Cliente'.
      const nameToDisplay = (entry.client_name_snapshot && entry.client_name_snapshot.trim() !== '')
        ? entry.client_name_snapshot
        : 'Cliente';
      clientName = `${nameToDisplay} (deletado)`;
    }

    return {
      id: entry.id,
      clientName: clientName,
      templateName: entry.template_id ? templateMap.get(entry.template_id) || 'Desconhecido' : 'Desconhecido',
      eventDate: entry.send_at || entry.timestamp,
      status: (entry.status_code && entry.status_code >= 200 && entry.status_code < 300) ? 'success' : (entry.status === 'pending' ? 'pending' : 'failed'),
      errorMessage: errorMessage, // Usar a mensagem de erro extraída
      requestPayload: entry.request_payload,
      responsePayload: entry.response_payload,
      creatorName: entry.user_id ? profileMap.get(entry.user_id) || 'Desconhecido' : 'Desconhecido',
    };
  });

  return { detailedData };
};


// --- COMPONENTES REUTILIZÁVEIS ---
interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  isLoading: boolean;
  onClick?: () => void;
  isClickable?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, colorClass, isLoading, onClick, isClickable = false }) => {
  const IconComponent = icon;
  return (
    <Card
      className={`bg-card p-4 sm:p-6 rounded-xl border border-border flex items-start gap-4 shadow-lg ${isClickable ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}`}
      onClick={isClickable ? onClick : undefined}
    >
      <div className={`p-2 sm:p-3 rounded-lg bg-muted ${colorClass}`}>
        <IconComponent size={20} className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div>
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</span>
        {isLoading ? (
          <Skeleton className="h-7 w-20 mt-1 sm:h-9 sm:w-24" />
        ) : (
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{value.toLocaleString('pt-BR')}</p>
        )}
      </div>
    </Card>
  );
};

interface StatusBadgeProps {
  status: 'success' | 'failed' | 'pending';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let IconComponent;
  let bgColor;
  let textColor;
  let text;

  switch (status) {
    case 'success':
      IconComponent = CheckCircle2;
      bgColor = 'bg-success/10';
      textColor = 'text-success';
      text = 'Sucesso';
      break;
    case 'failed':
      IconComponent = XCircle;
      bgColor = 'bg-destructive/10';
      textColor = 'text-destructive';
      text = 'Falha';
      break;
    case 'pending':
      IconComponent = Clock;
      bgColor = 'bg-yellow-500/10';
      textColor = 'text-yellow-500';
      text = 'Pendente';
      break;
    default:
      IconComponent = XCircle;
      bgColor = 'bg-muted/10';
      textColor = 'text-muted-foreground';
      text = 'Desconhecido';
  }

  return (
    <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      <IconComponent size={12} className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      {text}
    </span>
  );
};

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
export default function ConnectionMetrics() {
  const { role } = useAuth();

  // Mover a declaração de activeFilter para o topo do componente
  const [activeFilter, setActiveFilter] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedFailureDetails, setSelectedFailureDetails] = useState<DetailedHistoryItem | null>(null);

  // Hooks para usuários não-admin (via Edge Function)
  const { data, isLoading, error } = useQuery<ConnectionMetricsData, Error>({
    queryKey: ['connectionMetrics'],
    queryFn: fetchConnectionMetrics,
    enabled: role !== 'admin', // Habilitado apenas para não-admins
    refetchInterval: 10000,
  });

  const { data: detailedData, isLoading: isLoadingDetailed, error: detailedError } = useQuery<
    { detailedData: DetailedHistoryItem[] },
    Error,
    { detailedData: DetailedHistoryItem[] },
    ['connectionMetricsDetailed', 'pending' | 'success' | 'failed']
  >({
    queryKey: ['connectionMetricsDetailed', activeFilter!],
    queryFn: () => fetchDetailedMetrics(activeFilter!),
    enabled: role !== 'admin' && !!activeFilter, // Habilitado apenas para não-admins
    refetchInterval: 5000,
  });

  // Hooks para administradores (via consulta direta)
  const { data: adminData, isLoading: isLoadingAdmin, error: adminError } = useQuery<ConnectionMetricsData, Error>({
    queryKey: ['adminConnectionMetricsDirect'],
    queryFn: fetchAdminConnectionMetricsDirect,
    enabled: role === 'admin', // Habilitado apenas para admins
    refetchInterval: 10000,
  });

  const { data: adminDetailedData, isLoading: isLoadingAdminDetailed, error: adminDetailedError } = useQuery<
    { detailedData: DetailedHistoryItem[] },
    Error,
    { detailedData: DetailedHistoryItem[] },
    ['adminConnectionMetricsDetailed', 'pending' | 'success' | 'failed']
  >({
    queryKey: ['adminConnectionMetricsDetailed', activeFilter!],
    queryFn: () => fetchAdminDetailedMetricsDirect(activeFilter!),
    enabled: role === 'admin' && !!activeFilter, // Habilitado apenas para admins
    refetchInterval: 5000,
  });

  // Determinar qual fonte de dados usar
  const currentData = role === 'admin' ? adminData : data;
  const currentIsLoading = role === 'admin' ? isLoadingAdmin : isLoading;
  const currentError = role === 'admin' ? adminError : error;

  const currentDetailedData = role === 'admin' ? adminDetailedData : detailedData;
  const currentIsLoadingDetailed = role === 'admin' ? isLoadingAdminDetailed : isLoadingDetailed;
  const currentDetailedError = role === 'admin' ? adminDetailedError : detailedError;


  const handleCardClick = useCallback((status: 'pending' | 'success' | 'failed') => {
    setActiveFilter(status);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setActiveFilter(null);
  }, []);

  const handleViewFailureDetails = useCallback((item: DetailedHistoryItem) => {
    setSelectedFailureDetails(item);
    setShowDetailsDialog(true);
  }, []);

  if (currentError) {
    return <div className="text-destructive p-4 sm:p-8">Erro ao carregar métricas: {currentError.message}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Métricas de Envio</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Acompanhe o desempenho das suas notificações via WhatsApp.</p>
      </header>

      <section className="mb-8 sm:mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <KpiCard
            title="Enviados"
            value={currentData?.metrics.sent ?? 0}
            icon={Send}
            colorClass="text-primary"
            isLoading={currentIsLoading}
            onClick={() => handleCardClick('success')}
            isClickable
          />
          <KpiCard
            title="Agendados"
            value={currentData?.metrics.scheduled ?? 0}
            icon={Clock}
            colorClass="text-yellow-500"
            isLoading={currentIsLoading}
            onClick={() => handleCardClick('pending')}
            isClickable
          />
          <KpiCard
            title="Falhas"
            value={currentData?.metrics.failed ?? 0}
            icon={XCircle}
            colorClass="text-destructive"
            isLoading={currentIsLoading}
            onClick={() => handleCardClick('failed')}
            isClickable
          />
        </div>
      </section>

      {activeFilter ? (
        <Card className="border-border bg-card shadow-lg mt-6 sm:mt-8">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">
              Detalhes: {activeFilter === 'pending' ? 'Agendados' : activeFilter === 'success' ? 'Enviados' : 'Falhas'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleCloseDetails}>
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {currentIsLoadingDetailed ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : currentDetailedError ? (
              <div className="text-destructive p-4 text-sm">Erro ao carregar detalhes: {currentDetailedError.message}</div>
            ) : (currentDetailedData?.detailedData.length === 0 ? (
              <div className="text-muted-foreground text-center py-8 sm:py-10 text-sm sm:text-base">
                Nenhum item encontrado para este status.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1 sm:gap-2"><User size={14} className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>Cliente</TableHead>
                      <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground"><FileText size={14} className="inline mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"/>Template</TableHead>
                      <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground"><Calendar size={14} className="inline mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"/>Data/Hora do Evento</TableHead>
                      {role === 'admin' && <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1 sm:gap-2"><UserCircle size={14} className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>Criado Por</TableHead>} {/* Coluna condicional */}
                      <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground">Status</TableHead>
                      {activeFilter === 'failed' && <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDetailedData?.detailedData.map((item: DetailedHistoryItem) => (
                      <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm font-medium text-foreground">{item.clientName}</TableCell>
                        <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm text-muted-foreground">{item.templateName}</TableCell>
                        <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm text-muted-foreground">
                          {new Date(item.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </TableCell>
                        {role === 'admin' && <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm text-muted-foreground">{item.creatorName || 'Desconhecido'}</TableCell>} {/* Célula condicional */}
                        <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm text-muted-foreground">
                          <StatusBadge status={item.status} />
                        </TableCell>
                        {activeFilter === 'failed' && (
                          <TableCell className="py-3 px-3">
                            <Button variant="ghost" size="icon" onClick={() => handleViewFailureDetails(item)}>
                              <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <section>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Histórico de Envios Recentes</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1 sm:gap-2"><User size={14} className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>Cliente</TableHead>
                    <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground"><FileText size={14} className="inline mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"/>Template</TableHead>
                    <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground"><Calendar size={14} className="inline mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"/>Data do Envio</TableHead>
                    {role === 'admin' && <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1 sm:gap-2"><UserCircle size={14} className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>Criado Por</TableHead>} {/* Coluna condicional */}
                    <TableHead className="py-2.5 px-3 text-left text-xs sm:text-sm font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentIsLoading ? (
                    <tr><TableCell colSpan={role === 'admin' ? 5 : 4}><Skeleton className="h-16 w-full" /></TableCell></tr>
                  ) : currentData?.history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={role === 'admin' ? 5 : 4} className="text-center py-8 sm:py-10 text-muted-foreground text-sm sm:text-base">
                        Nenhum histórico de envio encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentData?.history.map((item: HistoryItem) => (
                      <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm font-medium text-foreground">{item.clientName}</TableCell>
                        <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm text-muted-foreground">{item.templateName}</TableCell>
                        <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm text-muted-foreground">{item.sentDate}</TableCell>
                        {role === 'admin' && <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm text-muted-foreground">{item.creatorName || 'Desconhecido'}</TableCell>} {/* Célula condicional */}
                        <TableCell className="whitespace-nowrap py-3 px-3 text-xs sm:text-sm text-muted-foreground">
                          <StatusBadge status={item.status as 'success' | 'failed'} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      )}

      {selectedFailureDetails && (
        <WebhookDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          requestPayload={selectedFailureDetails.requestPayload}
          responsePayload={selectedFailureDetails.responsePayload}
          errorMessage={selectedFailureDetails.errorMessage}
        />
      )}
    </div>
  );
}