import React, { useState, useEffect } from 'react';
import { Trash2 as Trash2Icon, SlidersHorizontal as SlidersHorizontalIcon, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { SubscriberAutomation, SubscriberTemplate } from '@/integrations/supabase/schema'; // Corrected import paths
import { UserWithDetails } from '@/hooks/useSubscriberManagement'; // Keep UserWithDetails from hook
import { toast } from 'sonner';

interface SubscriberAutomationRowProps {
  automation: SubscriberAutomation;
  templates: SubscriberTemplate[] | undefined;
  allUsers: UserWithDetails[] | undefined;
  isLoadingTemplates: boolean;
  isLoadingAllUsers: boolean;
  updateAutomationMutation: any;
  deleteAutomationMutation: any;
  onOpenSubscriberConfig: (automation: SubscriberAutomation) => void;
}

export const SubscriberAutomationRow: React.FC<SubscriberAutomationRowProps> = ({
  automation,
  templates,
  allUsers,
  isLoadingTemplates,
  isLoadingAllUsers,
  updateAutomationMutation,
  deleteAutomationMutation,
  onOpenSubscriberConfig,
}) => {
  const [localScheduledTime, setLocalScheduledTime] = useState(automation.scheduled_time.substring(0, 5));

  useEffect(() => {
    setLocalScheduledTime(automation.scheduled_time.substring(0, 5));
  }, [automation.scheduled_time]);

  const handleUpdateAutomation = async (field: keyof SubscriberAutomation, value: any) => {
    try {
      await updateAutomationMutation.mutateAsync({ id: automation.id, [field]: value });
    } catch (error: any) {
      toast.error(`Erro ao atualizar automação de assinante`, { description: "Não foi possível atualizar a automação de assinante. Tente novamente." });
    }
  };

  const handleRemoveAutomation = async () => {
    try {
      await deleteAutomationMutation.mutateAsync(automation.id);
    } catch (error: any) {
      toast.error(`Erro ao excluir automação de assinante`, { description: "Não foi possível excluir a automação de assinante. Tente novamente." });
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

  return (
    <TableRow key={automation.id}>
      <TableCell>
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
      <TableCell>
        <Input
          type="time"
          value={localScheduledTime}
          onChange={handleTimeChange}
          onBlur={handleTimeBlur}
          className="w-[120px]"
          disabled={isUpdating}
        />
      </TableCell>
      <TableCell>
        <Select
          value={automation.subscriber_template_id}
          onValueChange={(value) => handleUpdateAutomation('subscriber_template_id', value)}
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
      <TableCell>
        <Button
          variant="ghost"
          onClick={() => onOpenSubscriberConfig(automation)}
          className="text-primary hover:text-primary-foreground flex items-center gap-2"
          disabled={isLoadingAllUsers}
        >
          <SlidersHorizontalIcon className="h-4 w-4" />
          {automation.subscriber_ids.length} / {(allUsers || []).length} assinantes
        </Button>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemoveAutomation}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <Trash2Icon className="h-4 w-4 text-destructive" />}
        </Button>
      </TableCell>
    </TableRow>
  );
};