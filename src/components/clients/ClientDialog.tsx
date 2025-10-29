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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import { usePlans } from "@/hooks/usePlans";
import { useCreateClient, useUpdateClient } from "@/hooks/useClients";
import { useCreateFinancialEntry } from "@/hooks/useFinancialEntries";
import { Client, ClientStatus } from "@/integrations/supabase/schema"; // Importar Client e ClientStatus do schema
import { isBefore, format } from "date-fns"; // 'format' adicionado para uso
import { supabase } from "@/integrations/supabase/client"; // Importar supabase para obter user_id

const clientSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  phone: z.string()
    .min(13, "Telefone deve ter 13 dígitos (ex: 5511984701079)")
    .max(13, "Telefone deve ter 13 dígitos (ex: 5511984701079)")
    .regex(/^55\d{11}$/, "Formato de telefone inválido. Use 55 + DDD + número (ex: 5511984701079)"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  notes: z.string().optional(),
  plan_id: z.string().uuid("Selecione um plano"),
  value: z.number().positive("Valor deve ser positivo"),
  next_billing_date: z.string(),
});

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null; // Usar o tipo Client importado
}

export function ClientDialog({ open, onOpenChange, client }: ClientDialogProps) {
  const { data: plans, isLoading: isLoadingPlans, error: plansError } = usePlans();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const createFinancialEntryMutation = useCreateFinancialEntry();

  const [loading, setLoading] = useState(false);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    plan_id: "",
    value: "",
    next_billing_date: "",
  });

  // Definir todayNormalized para a meia-noite do dia atual no fuso horário local
  const today = new Date();
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  todayNormalized.setHours(0, 0, 0, 0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (open) {
      if (client) {
        setFormData({
          name: client.name || "",
          phone: client.phone || "",
          email: client.email || "",
          notes: client.notes || "",
          plan_id: client.plan_id || "",
          value: client.value?.toString() || "",
          next_billing_date: client.next_billing_date || "",
        });
        setMarkAsPaid(false);
      } else {
        // Ao criar um novo cliente, a data de vencimento padrão é hoje.
        const defaultNextBillingDate = format(today, 'yyyy-MM-dd'); // Formato YYYY-MM-DD

        // Cria um objeto Date local para a data de vencimento padrão, normalizado para meia-noite
        const defaultDueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        defaultDueDate.setHours(0, 0, 0, 0);
        
        // O checkbox deve ser marcado se a data de vencimento padrão não for anterior a hoje
        setMarkAsPaid(!isBefore(defaultDueDate, todayNormalized));
        setFormData(prev => ({
          ...prev,
          next_billing_date: defaultNextBillingDate,
        }));
      }
    }
  }, [open, client]); // Adicionado 'today' como dependência para o useEffect

  useEffect(() => {
    if (plansError) {
      toast.error("Erro ao carregar planos", { description: "Não foi possível carregar os planos. Verifique sua conexão ou tente mais tarde." });
    }
  }, [plansError]);

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans?.find((p) => p.id === planId);
    if (selectedPlan) {
      setFormData({
        ...formData,
        plan_id: planId,
        value: selectedPlan.value.toString(),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!currentUserId) throw new Error("Usuário não autenticado.");

      const validatedData = clientSchema.parse({
        ...formData,
        value: parseFloat(formData.value),
        next_billing_date: formData.next_billing_date,
      });

      const selectedPlan = plans?.find((p) => p.id === validatedData.plan_id);
      if (!selectedPlan) throw new Error("Plano não encontrado");

      // A data de vencimento é uma string 'YYYY-MM-DD' do input
      const formattedDateString = validatedData.next_billing_date;

      // Determinar status com base na comparação de datas locais
      // Cria um objeto Date local para a data de vencimento do formulário, normalizado para meia-noite
      const clientDueDate = new Date(formattedDateString + 'T00:00:00'); // Força interpretação local
      clientDueDate.setHours(0,0,0,0); // Normaliza para meia-noite

      let determinedStatus: ClientStatus = "active";
      if (isBefore(clientDueDate, todayNormalized)) {
        determinedStatus = "overdue";
      } else if (client && client.status === "inactive") {
        // Preservar status 'inactive' para clientes existentes se não estiver vencido
        determinedStatus = "inactive";
      }

      const clientDataToSave = {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || "",
        notes: validatedData.notes || "",
        plan_id: validatedData.plan_id,
        value: validatedData.value,
        next_billing_date: formattedDateString, // Usar a string formatada diretamente
        status: determinedStatus,
        due_date: formattedDateString, // Também aplicar a due_date para consistência
        user_id: currentUserId, // Adicionar user_id aqui
      };

      if (client) {
        // Para atualização, removemos 'due_date' do objeto, pois não deve ser alterado
        const { due_date, ...updateData } = clientDataToSave;
        await updateClientMutation.mutateAsync({ id: client.id, ...updateData });
        toast.success("Cliente atualizado!", { description: "As informações foram salvas com sucesso." });
      } else {
        const newClient = await createClientMutation.mutateAsync(clientDataToSave);
        toast.success("Cliente criado!", { description: "Novo cliente adicionado com sucesso." });

        if (markAsPaid && newClient) {
          await createFinancialEntryMutation.mutateAsync({
            user_id: newClient.user_id,
            description: `Pagamento inicial - ${newClient.name}`,
            value: newClient.value,
            type: "credit",
          });
          toast.success("Pagamento registrado!", { description: "A entrada financeira foi adicionada ao extrato." });
        }
      }

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Erro de validação", { description: "Verifique os campos preenchidos e tente novamente." });
      } else {
        toast.error("Erro ao salvar cliente", { description: "Não foi possível salvar o cliente. Tente novamente." });
      }
    } finally {
      setLoading(false);
    }
  };

  // Calcula a data de vencimento do formulário para desabilitar o checkbox
  const formDueDate = formData.next_billing_date ? new Date(formData.next_billing_date + 'T00:00:00') : new Date();
  formDueDate.setHours(0,0,0,0); // Normaliza para meia-noite

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>
            Preencha as informações do cliente e selecione um plano.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="5511984701079"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan">Plano *</Label>
              <Select value={formData.plan_id} onValueChange={handlePlanChange} disabled={isLoadingPlans}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingPlans ? (
                    <SelectItem value="loading" disabled>Carregando planos...</SelectItem>
                  ) : (
                    plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {Number(plan.value).toFixed(2)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_billing_date">Data de Vencimento *</Label>
            <Input
              id="next_billing_date"
              type="date"
              value={formData.next_billing_date}
              onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {!client && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mark-as-paid"
                checked={markAsPaid}
                onCheckedChange={(checked) => setMarkAsPaid(checked as boolean)}
                disabled={isBefore(formDueDate, todayNormalized)}
              />
              <label
                htmlFor="mark-as-paid"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Marcar como pago e adicionar ao extrato
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || createClientMutation.isPending || updateClientMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || createClientMutation.isPending || updateClientMutation.isPending}>
              {loading || createClientMutation.isPending || updateClientMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}