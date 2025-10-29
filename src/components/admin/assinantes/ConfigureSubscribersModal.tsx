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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { UserWithDetails } from '@/hooks/useSubscriberManagement';
import { AppSubscriptionStatus } from '@/integrations/supabase/schema'; // Import the new type

interface ConfigureSubscribersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allSubscribers: UserWithDetails[] | undefined;
  selectedSubscriberIds: string[];
  onSave: (newSelectedIds: string[]) => void;
  isLoading: boolean;
}

export function ConfigureSubscribersModal({
  open,
  onOpenChange,
  allSubscribers,
  selectedSubscriberIds,
  onSave,
  isLoading,
}: ConfigureSubscribersModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSelection, setCurrentSelection] = useState<string[]>(selectedSubscriberIds);

  useEffect(() => {
    setCurrentSelection(selectedSubscriberIds);
  }, [selectedSubscriberIds, open]);

  const filteredSubscribers = (allSubscribers || [])
    .filter(subscriber =>
      subscriber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subscriber.phone && subscriber.phone.includes(searchTerm))
    )
    .sort((a, b) => {
      // Sort active subscribers first
      const aStatus: AppSubscriptionStatus = a.subscription?.status || 'inactive';
      const bStatus: AppSubscriptionStatus = b.subscription?.status || 'inactive';
      
      if (aStatus === 'active' && bStatus !== 'active') return -1;
      if (aStatus !== 'active' && bStatus === 'active') return 1;
      
      return a.name.localeCompare(b.name);
    });

  const handleCheckboxChange = (subscriberId: string, checked: boolean) => {
    setCurrentSelection(prev =>
      checked ? [...prev, subscriberId] : prev.filter(id => id !== subscriberId)
    );
  };

  const handleSave = () => {
    onSave(currentSelection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Configurar Assinantes para Automação</DialogTitle>
          <DialogDescription>
            Selecione os assinantes que farão parte desta automação.
          </DialogDescription>
        </DialogHeader>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar assinantes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Carregando assinantes...
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Nenhum assinante encontrado.
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="grid gap-2">
              {filteredSubscribers.map((subscriber) => (
                <div key={subscriber.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                  <Checkbox
                    id={`subscriber-${subscriber.id}`}
                    checked={currentSelection.includes(subscriber.id)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(subscriber.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`subscriber-${subscriber.id}`}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {subscriber.name} ({subscriber.email})
                    {subscriber.phone && <span className="text-muted-foreground ml-2">({subscriber.phone})</span>}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Seleção ({currentSelection.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}