import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Importar Checkbox
import { toast } from "sonner";
import { z } from "zod";
import { SubscriberPlan, SubscriberPlanUpdate } from "@/integrations/supabase/schema"; // Adicionado SubscriberPlanUpdate
import { useCreateSubscriberPlan, useUpdateSubscriberPlan } from "@/hooks/useSubscriberManagement";

interface SubscriberPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriberPlan | null;
}

const subscriberPlanSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  value: z.number().positive("Valor deve ser positivo"),
  period_days: z.number().positive("Período deve ser positivo"),
  is_free: z.boolean(), // Adicionado para validação
});

export function SubscriberPlanDialog({ open, onOpenChange, plan }: SubscriberPlanDialogProps) {
  const createPlanMutation = useCreateSubscriberPlan();
  const updatePlanMutation = useUpdateSubscriberPlan();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    value: "",
    period_type: "custom",
    period_days: "",
    is_free: false, // Novo estado para o checkbox
  });

  useEffect(() => {
    if (open && plan) {
      setFormData({
        name: plan.name || "",
        value: plan.value?.toString() || "",
        period_type: plan.period_days === 1 ? "daily" : plan.period_days === 7 ? "weekly" : plan.period_days === 30 ? "monthly" : "custom",
        period_days: plan.period_days?.toString() || "",
        is_free: plan.is_free || false, // Carregar estado de is_free
      });
    } else if (open) {
      setFormData({
        name: "",
        value: "",
        period_type: "custom",
        period_days: "",
        is_free: false, // Padrão para novo plano
      });
    }
  }, [open, plan]);

  const handlePeriodTypeChange = (value: string) => {
    setFormData({
      ...formData,
      period_type: value,
      period_days: value === "daily" ? "1" : value === "weekly" ? "7" : value === "monthly" ? "30" : "",
    });
  };

  const handleIsFreeChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_free: checked,
      value: checked ? "0" : "", // Define valor como 0 se for gratuito
      period_type: checked ? "custom" : prev.period_type, // Mantém custom para desabilitar
      period_days: checked ? "0" : "", // Define período como 0 se for gratuito
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ajustar o schema de validação com base em is_free
      const currentSchema = formData.is_free
        ? subscriberPlanSchema.omit({ value: true, period_days: true }).extend({
            value: z.literal(0, { invalid_type_error: "Valor deve ser 0 para plano gratuito" }),
            period_days: z.literal(0, { invalid_type_error: "Período deve ser 0 para plano gratuito" }),
          })
        : subscriberPlanSchema;

      const validatedData = currentSchema.parse({
        name: formData.name,
        value: parseFloat(formData.value),
        period_days: parseInt(formData.period_days),
        is_free: formData.is_free,
      });

      if (plan) { // Caminho de atualização
        let payloadToSend: SubscriberPlanUpdate & { id: string };

        if (validatedData.is_free) {
          // Para planos gratuitos, o validatedData já tem is_free: true e value/period_days como 0
          payloadToSend = { id: plan.id, ...validatedData };
        } else {
          // Para planos pagos, omitir explicitamente 'is_free' do payload
          // A Edge Function pode não esperar este campo em PUTs para planos pagos.
          const { is_free, ...restOfValidatedData } = validatedData;
          payloadToSend = { id: plan.id, ...restOfValidatedData };
        }

        console.log('Payload para Edição (Pago/Gratuito):', payloadToSend); // Log de diagnóstico
        await updatePlanMutation.mutateAsync(payloadToSend);
        toast.success("Plano de assinante atualizado!", { description: "As informações foram salvas com sucesso." });
      } else { // Caminho de criação
        console.log('Payload para Criação:', validatedData); // Log de diagnóstico
        await createPlanMutation.mutateAsync(validatedData);
        toast.success("Plano de assinante criado!", { description: "Novo plano adicionado com sucesso." });
      }

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Erro de validação", { description: "Verifique os campos preenchidos e tente novamente." });
      } else {
        toast.error("Erro ao salvar plano de assinante", { description: "Não foi possível salvar o plano de assinante. Tente novamente." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? "Editar Plano de Assinante" : "Novo Plano de Assinante"}</DialogTitle>
          <DialogDescription>
            Configure o nome, valor e período de cobrança do plano de assinatura da plataforma.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Plano *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Plano Básico"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-free"
              checked={formData.is_free}
              onCheckedChange={(checked) => handleIsFreeChange(checked as boolean)}
            />
            <label
              htmlFor="is-free"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Plano Gratuito
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$) *</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="0.00"
              required
              disabled={formData.is_free} // Desabilitar se for gratuito
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_type">Período *</Label>
            <Select value={formData.period_type} onValueChange={handlePeriodTypeChange} disabled={formData.is_free}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.period_type === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="period_days">Número de Dias *</Label>
              <Input
                id="period_days"
                type="number"
                value={formData.period_days}
                onChange={(e) => setFormData({ ...formData, period_days: e.target.value })}
                placeholder="Ex: 15"
                required
                disabled={formData.is_free} // Desabilitar se for gratuito
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || createPlanMutation.isPending || updatePlanMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || createPlanMutation.isPending || updatePlanMutation.isPending}>
              {loading || createPlanMutation.isPending || updatePlanMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}