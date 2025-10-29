import React, { useState, useEffect } from 'react';
import { Trash2 as Trash2Icon, SlidersHorizontal as SlidersHorizontalIcon, Loader2, MoreHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Automation, Template, Client } from '@/integrations/supabase/schema';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AutomationRowProps {
  automation: Automation;
  templates: Template[] | undefined;
  clients: Client[] | undefined;
  isLoadingTemplates: boolean;
  isLoadingClients: boolean;
  updateAutomationMutation: any;
  deleteAutomationMutation: any;
  onOpenClientConfig: (automation: Automation) => void;
}

export const AutomationRow: React.FC<AutomationRowProps> = ({
  automation,
  templates,
  clients,
  isLoadingTemplates,
  isLoadingClients,
  updateAutomationMutation,
  deleteAutomationMutation,
  onOpenClientConfig,
}) => {
  const [localScheduledTime, setLocalScheduledTime] = useState(automation.scheduled_time.substring(0, 5));

  useEffect(() => {
    setLocalScheduledTime(automation.scheduled_time.substring(0, 5));
  }, [automation.scheduled_time]);

  const handleUpdateAutomation = async (field: keyof Automation, value: any) => {
    try {
      await updateAutomationMutation.mutateAsync({ id: automation.id, [field]: value });
    } catch (error: any) {
      toast.error(`Erro ao atualizar automação`, { description: "Não foi possível atualizar a automação. Tente novamente." });
    }
  };

  const handleRemoveAutomation = async () => {
    try {
      await deleteAutomationMutation.mutateAsync(automation.id);
    } catch (error: any) {
      toast.error(`Erro ao excluir automação`, { description: "Não foi possível excluir a automação. Tente novamente." });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalScheduledTime(e.target.value);
  };

  const handleTimeBlur = () => {
    if (localScheduledTime !== automation.scheduled_time.substring(0, 5)) {
      handleUpdateAutomation('scheduled_time', localScheduledTime + ':00');
    }
  };

  const isUpdating = updateAutomationMutation.isPending;
  const isDeleting = deleteAutomationMutation.isPending;

  // Get client names for display
  const clientNames = automation.client_ids
    .map(clientId => clients?.find(c => c.id === clientId)?.name)
    .filter(Boolean) // Remove undefined names
    .join(', ');

  return (
    <TableRow key={automation.id}>
      <TableCell className="whitespace-nowrap text-xs sm:text-sm">
        <Select
          value={automation.days_offset.toString()}
          onValueChange={(value) => handleUpdateAutomation('days_offset', Number(value))}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-5">5 dias antes do vencimento</SelectItem>
            <SelectItem value="-4">4 dias antes do vencimento</SelectItem>
            <SelectItem value="-3">3 dias antes do vencimento</SelectItem>
            <SelectItem value="-2">2 dias antes do vencimento</SelectItem>
            <SelectItem value="-1">1 dia antes do vencimento</SelectItem>
            <SelectItem value="0">No dia do vencimento</SelectItem>
            <SelectItem value="1">1 dia após o vencimento</SelectItem>
            <SelectItem value="2">2 dias após o vencimento</SelectItem>
            <SelectItem value="3">3 dias após o vencimento</SelectItem>
            <SelectItem value="4">4 dias após o vencimento</SelectItem>
            <SelectItem value="5">5 dias após o vencimento</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs sm:text-sm">
        <Input
          type="time"
          value={localScheduledTime}
          onChange={handleTimeChange}
          onBlur={handleTimeBlur}
          className="w-[120px]"
          disabled={isUpdating}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs sm:text-sm">
        <Select
          value={automation.template_id}
          onValueChange={(value) => handleUpdateAutomation('template_id', value)}
          disabled={isLoadingTemplates || isUpdating}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione um template" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingTemplates ? (
              <SelectItem value="loading" disabled>Carregando templates...</SelectItem>
            ) : (templates || []).length === 0 ? (
              <SelectItem value="no-templates" disabled>Nenhum template disponível</SelectItem>
            ) : (
              templates?.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-xs sm:text-sm max-w-[250px] truncate">
        {clientNames || 'Nenhum cliente selecionado'}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs sm:text-sm">
        {format(new Date(automation.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs sm:text-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onOpenClientConfig(automation)}
              disabled={isLoadingClients}
              className="text-sm"
            >
              <SlidersHorizontalIcon className="h-4 w-4 mr-2" />
              Configurar Clientes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleRemoveAutomation}
              className="text-destructive text-sm"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2Icon className="h-4 w-4 mr-2" />}
              Excluir Automação
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};