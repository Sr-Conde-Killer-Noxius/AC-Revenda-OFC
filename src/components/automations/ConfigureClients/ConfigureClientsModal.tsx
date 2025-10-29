import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon, X as XIcon, Loader2, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useClients } from '@/hooks/useClients';
import { Automation } from '@/integrations/supabase/schema'; // Corrigido: Removido 'Client'
import { Client } from '@/hooks/useClients'; // Importar Client do hook useClients para tipagem interna

interface ConfigureClientsModalProps {
  automation: Automation;
  onClose: () => void;
  onSave: (automationId: string, clientIds: string[]) => void;
}

export const ConfigureClientsModal: React.FC<ConfigureClientsModalProps> = ({ automation, onClose, onSave }) => {
  const { data: allClients, isLoading: isLoadingClients, error: clientsError } = useClients();
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(automation.client_ids || []);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (clientsError) {
      toast.error(`Erro ao carregar clientes`, { description: "Não foi possível carregar a lista de clientes. Verifique sua conexão." });
    }
  }, [clientsError]);

  const activeClients = useMemo(() => (allClients || []).filter(c => c.status === 'active'), [allClients]);

  const filteredClients = useMemo(() => {
    if (!allClients) return [];
    const filtered = allClients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      (client.notes && client.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchTerm, allClients]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedClientIds(checked ? activeClients.map(c => c.id) : []);
  };

  const handleClientSelection = (clientId: string, isChecked: boolean) => {
    setSelectedClientIds(prev => isChecked ? [...prev, clientId] : prev.filter(id => id !== clientId));
  };

  const handleSave = () => {
    onSave(automation.id, selectedClientIds);
    onClose();
  };

  const isAllSelected = selectedClientIds.length === activeClients.length && activeClients.length > 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurar Clientes</DialogTitle>
          <DialogDescription>Selecione os clientes para esta regra de automação. Apenas clientes ativos podem ser selecionados.</DialogDescription>
        </DialogHeader>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nome, telefone ou observações..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex-grow overflow-y-auto px-4">
          {isLoadingClients ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground mt-2">Carregando clientes...</p>
            </div>
          ) : (allClients || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              Nenhum cliente disponível.
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      aria-label="Selecionar todos os clientes ativos"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client: Client) => { // Adicionado tipagem explícita para 'client'
                  const isDisabled = client.status !== 'active';
                  return (
                    <TableRow key={client.id} className={cn(isDisabled && "opacity-50 text-muted-foreground cursor-not-allowed")}>
                      <TableCell>
                        <Checkbox
                          checked={selectedClientIds.includes(client.id) && !isDisabled}
                          onCheckedChange={(checked) => handleClientSelection(client.id, checked as boolean)}
                          disabled={isDisabled}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{client.phone}</TableCell>
                      <TableCell>
                        {client.status === 'active' && <span className="text-success">Ativo</span>}
                        {client.status === 'overdue' && <span className="text-destructive">Vencido</span>}
                        {client.status === 'inactive' && <span className="text-muted-foreground">Inativo</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter className="p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            <XIcon className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoadingClients}>
            <UsersIcon className="h-4 w-4 mr-2" />
            Salvar Clientes ({selectedClientIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};