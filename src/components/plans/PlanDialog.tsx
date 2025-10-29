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
import { toast } from "sonner";
import { z } from "zod";
import { useCreatePlan, useUpdatePlan } from "@/hooks/usePlans";
import { Plan } from "@/integrations/supabase/schema"; // Importar Plan do schema
import { supabase } from "@/integrations/supabase/client"; // Importar supabase para obter user_id

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}

const planSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  value: z.number().positive("Valor deve ser positivo"),
  period_days: z.number().positive("Período deve ser positivo"),
});

export function PlanDialog({ open, onOpenChange, plan }: PlanDialogProps) {
  const createPlanMutation = useCreatePlan();
  const updatePlanMutation = useUpdatePlan();

  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    value: "",
    period_type: "custom",
    period_days: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (open && plan) {
      setFormData({
        name: plan.name || "",
        value: plan.value?.toString() || "",
        period_type: plan.period_days === 1 ? "daily" : plan.period_days === 7 ? "weekly" : plan.period_days === 30 ? "monthly" : "custom",
        period_days: plan.period_days?.toString() || "",
      });
    } else if (open) {
      setFormData({
        name: "",
        value: "",
        period_type: "custom",
        period_days: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!currentUserId) throw new Error("Usuário não autenticado.");

      const validatedData = planSchema.parse({
        name: formData.name,
        value: parseFloat(formData.value),
        period_days: parseInt(formData.period_days),
      });

      const planData = {
        name: validatedData.name,
        value: validatedData.value,
        period_days: validatedData.period_days,
        user_id: currentUserId, // Adicionar user_id aqui
      };

      if (plan) {
        await updatePlanMutation.mutateAsync({ id: plan.id, ...planData });
        toast.success("Plano atualizado!", { description: "As informações foram salvas com sucesso." });
      } else {
        await createPlanMutation.mutateAsync(planData);
        toast.success("Plano criado!", { description: "Novo plano adicionado com sucesso." });
      }

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Erro de validação", { description: "Verifique os campos preenchidos e tente novamente." });
      } else {
        toast.error("Erro ao salvar plano", { description: "Não foi possível salvar o plano. Tente novamente." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          <DialogDescription>
            Configure o nome, valor e período de cobrança do plano.
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_type">Período *</Label>
            <Select value={formData.period_type} onValueChange={handlePeriodTypeChange}>
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