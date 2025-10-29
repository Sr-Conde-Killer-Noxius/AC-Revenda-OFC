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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  UserWithDetails,
  useUpdateUserSubscription,
} from '@/hooks/useSubscriberManagement';
import { AppSubscriptionStatus, SubscriberPlan } from '@/integrations/supabase/schema'; // Corrected import for SubscriberPlan

interface UpdateSubscriberSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithDetails;
  subscriberPlans: SubscriberPlan[] | undefined;
  isLoadingSubscriberPlans: boolean;
}

export function UpdateSubscriberSubscriptionDialog({
  open,
  onOpenChange,
  user,
  subscriberPlans,
  isLoadingSubscriberPlans,
}: UpdateSubscriberSubscriptionDialogProps) {
  const updateUserSubscriptionMutation = useUpdateUserSubscription();

  const [planName, setPlanName] = useState(user.subscription?.plan_name || '');
  const [price, setPrice] = useState(user.subscription?.price?.toString() || '0.00');
  const [status, setStatus] = useState<AppSubscriptionStatus>(user.subscription?.status || 'inactive');
  const [nextBillingDate, setNextBillingDate] = useState<Date | undefined>(
    user.subscription?.next_billing_date ? new Date(user.subscription.next_billing_date + 'T00:00:00') : undefined
  );
  const [isFreePlan, setIsFreePlan] = useState(user.subscription?.isFree || false);

  useEffect(() => {
    if (user) {
      setPlanName(user.subscription?.plan_name || '');
      setPrice(user.subscription?.price?.toString() || '0.00');
      setStatus(user.subscription?.status || 'inactive');
      setNextBillingDate(
        user.subscription?.next_billing_date ? new Date(user.subscription.next_billing_date + 'T00:00:00') : undefined
      );
      setIsFreePlan(user.subscription?.isFree || false);
    }
  }, [user, open]);

  useEffect(() => {
    const selectedPlan = subscriberPlans?.find(p => p.name === planName);
    if (selectedPlan) {
      setPrice(selectedPlan.value.toString());
      setIsFreePlan(selectedPlan.is_free);
      if (selectedPlan.is_free) {
        setNextBillingDate(undefined);
        setStatus('active');
      } else if (!nextBillingDate) {
        const today = new Date();
        today.setDate(today.getDate() + 30);
        setNextBillingDate(today);
        setStatus('active');
      }
    }
  }, [planName, subscriberPlans]);

  const handleSave = async () => {
    if (!user.subscription?.id) {
      toast.error("Erro", { description: "ID da assinatura não encontrado." });
      return;
    }

    if (!planName) {
      toast.error("Erro", { description: "Selecione um plano." });
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Erro", { description: "Preço inválido." });
      return;
    }

    const payloadForBackend = {
      subscriptionId: user.subscription.id,
      userId: user.id,
      plan_name: planName,
      price: parsedPrice,
      status: status,
      next_billing_date: isFreePlan ? null : (nextBillingDate ? format(nextBillingDate, 'yyyy-MM-dd') : null),
    };

    try {
      await updateUserSubscriptionMutation.mutateAsync(payloadForBackend);
      onOpenChange(false);
    } catch (err: any) {
      // Error already handled by the mutation's onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Assinatura de {user.name}</DialogTitle>
          <DialogDescription>
            Atualize os detalhes da assinatura do usuário.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="plan" className="text-right">
              Plano
            </Label>
            <Select value={planName} onValueChange={setPlanName} disabled={isLoadingSubscriberPlans}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {subscriberPlans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.name}>
                    {plan.name} ({plan.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Preço
            </Label>
            <Input
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="col-span-3"
              type="number"
              step="0.01"
              disabled={isFreePlan}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={(value: AppSubscriptionStatus) => setStatus(value)} disabled={isFreePlan}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="inactive">Inativa</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nextBillingDate" className="text-right">
              Próximo Vencimento
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !nextBillingDate && "text-muted-foreground"
                  )}
                  disabled={isFreePlan}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextBillingDate ? format(nextBillingDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={nextBillingDate}
                  onSelect={setNextBillingDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateUserSubscriptionMutation.isPending}>
            {updateUserSubscriptionMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}