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
import { toast } from "sonner";
import { z } from "zod";
import { FinancialEntry } from "@/integrations/supabase/schema"; // Importar FinancialEntry do schema
import { useUpdateFinancialEntry } from "@/hooks/useFinancialEntries";
import { format, setHours, setMinutes } from "date-fns"; // Importar setHours e setMinutes
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const financialEntrySchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  value: z.number().positive("Valor deve ser positivo"),
  created_at: z.string(), // Adicionado para validação da data/hora formatada
});

interface EditFinancialEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FinancialEntry | null;
}

export function EditFinancialEntryDialog({ open, onOpenChange, entry }: EditFinancialEntryDialogProps) {
  const updateFinancialEntryMutation = useUpdateFinancialEntry();

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("00:00");

  const [formData, setFormData] = useState({
    description: "",
    value: "",
  });

  useEffect(() => {
    if (open && entry) {
      const entryDate = new Date(entry.created_at!); // Assert non-null
      setFormData({
        description: entry.description || "",
        value: entry.value?.toString() || "",
      });
      setSelectedDate(entryDate);
      setSelectedTime(format(entryDate, "HH:mm"));
    } else if (open) {
      setFormData({
        description: "",
        value: "",
      });
      setSelectedDate(new Date());
      setSelectedTime(format(new Date(), "HH:mm"));
    }
  }, [open, entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!entry) throw new Error("Nenhum lançamento selecionado para edição.");
      if (!selectedDate) throw new Error("Data é obrigatória.");

      const [hours, minutes] = selectedTime.split(':').map(Number);
      let combinedDateTime = setHours(selectedDate, hours);
      combinedDateTime = setMinutes(combinedDateTime, minutes);

      const isoDateTimeString = combinedDateTime.toISOString();

      const validatedData = financialEntrySchema.parse({
        description: formData.description,
        value: parseFloat(formData.value),
        created_at: isoDateTimeString,
      });

      await updateFinancialEntryMutation.mutateAsync({
        id: entry.id,
        description: validatedData.description,
        value: validatedData.value,
        created_at: validatedData.created_at,
      });

      toast.success("Lançamento atualizado!", { description: "As informações foram salvas com sucesso." });

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Erro de validação", { description: "Verifique os campos preenchidos e tente novamente." });
      } else {
        toast.error("Erro ao salvar lançamento", { description: "Não foi possível salvar o lançamento financeiro. Tente novamente." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lançamento</DialogTitle>
          <DialogDescription>
            Altere a descrição, o valor, a data e a hora do lançamento financeiro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Pagamento de mensalidade"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || updateFinancialEntryMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || updateFinancialEntryMutation.isPending}>
              {loading || updateFinancialEntryMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}