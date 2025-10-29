import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  useCreateSubscriberAutomation,
  useUpdateSubscriberAutomation,
  useSubscriberTemplates,
  useAllUsers,
} from '@/hooks/useSubscriberManagement';
import {
  SubscriberAutomation,
  SubscriberTemplate
} from '@/integrations/supabase/schema';

interface SubscriberAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: SubscriberAutomation | null;
}

export function SubscriberAutomationDialog({
  open,
  onOpenChange,
  automation,
}: SubscriberAutomationDialogProps) {
  const isEditMode = !!automation;
  const createMutation = useCreateSubscriberAutomation();
  const updateMutation = useUpdateSubscriberAutomation();
  const { data: templates, isLoading: isLoadingTemplates } = useSubscriberTemplates();
  const { data: allUsers, isLoading: isLoadingAllUsers } = useAllUsers();

  const [daysOffset, setDaysOffset] = useState(automation?.days_offset || 0);
  const [scheduledTime, setScheduledTime] = useState(automation?.scheduled_time || '09:00');
  const [templateId, setTemplateId] = useState(automation?.subscriber_template_id || '');
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<string[]>(automation?.subscriber_ids || []);

  useEffect(() => {
    if (open) {
      setDaysOffset(automation?.days_offset || 0);
      setScheduledTime(automation?.scheduled_time || '09:00');
      setTemplateId(automation?.subscriber_template_id || '');
      setSelectedSubscriberIds(automation?.subscriber_ids || []);
    }
  }, [open, automation]);

  const handleSave = async () => {
    if (!templateId) {
      toast.error("Erro", { description: "Selecione um template." });
      return;
    }
    if (selectedSubscriberIds.length === 0) {
      toast.error("Erro", { description: "Selecione pelo menos um assinante." });
      return;
    }

    const payload = {
      days_offset: daysOffset,
      scheduled_time: scheduledTime,
      subscriber_template_id: templateId,
      subscriber_ids: selectedSubscriberIds,
    };

    try {
      if (isEditMode && automation) {
        await updateMutation.mutateAsync({ id: automation.id, ...payload });
        toast.success("Automação atualizada com sucesso!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Automação criada com sucesso!");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar automação", { description: err.message });
    }
  };

  const handleSubscriberCheckboxChange = (subscriberId: string, checked: boolean) => {
    setSelectedSubscriberIds(prev =>
      checked ? [...prev, subscriberId] : prev.filter(id => id !== subscriberId)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Automação" : "Nova Automação"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Ajuste os detalhes da automação existente." : "Crie uma nova automação para seus assinantes."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-1 overflow-y-auto pr-4 -mr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="daysOffset" className="text-right">
              Dias de Offset
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Slider
                id="daysOffset"
                min={-30}
                max={30}
                step={1}
                value={[daysOffset]}
                onValueChange={(val) => setDaysOffset(val[0])}
                className="w-[calc(100%-50px)]"
              />
              <Input
                type="number"
                value={daysOffset}
                onChange={(e) => setDaysOffset(Number(e.target.value))}
                className="w-[50px] text-center"
              />
            </div>
            <p className="col-start-2 col-span-3 text-sm text-muted-foreground">
              {daysOffset === 0
                ? "No dia do vencimento"
                : daysOffset > 0
                  ? `${daysOffset} dias após o vencimento`
                  : `${Math.abs(daysOffset)} dias antes do vencimento`}
            </p>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scheduledTime" className="text-right">
              Hora Agendada (UTC)
            </Label>
            <Input
              id="scheduledTime"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="template" className="text-right">
              Template
            </Label>
            <Select value={templateId} onValueChange={setTemplateId} disabled={isLoadingTemplates}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template: SubscriberTemplate) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right mt-2">
              Assinantes
            </Label>
            <div className="col-span-3 space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {isLoadingAllUsers ? (
                <p className="text-muted-foreground text-sm">Carregando assinantes...</p>
              ) : allUsers && allUsers.length > 0 ? (
                allUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subscriber-${user.id}`}
                      checked={selectedSubscriberIds.includes(user.id)}
                      onCheckedChange={(checked) =>
                        handleSubscriberCheckboxChange(user.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`subscriber-${user.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {user.name} ({user.email})
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum assinante disponível.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || isLoadingTemplates || isLoadingAllUsers}
          >
            {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar Automação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}