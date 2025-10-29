import React, { useState, useEffect } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, ChevronsUpDown, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { useAllUsers, UserWithDetails } from '@/hooks/useSubscriberManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Enums } from '@/integrations/supabase/schema';
import {
  useCreateNotification,
  useUpdateNotification,
  NotificationWithCreator,
} from '@/hooks/useNotificationManagement';

interface AdminNotificationCrudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification?: NotificationWithCreator | null; // Opcional, para edição
}

export function AdminNotificationCrudDialog({ open, onOpenChange, notification }: AdminNotificationCrudDialogProps) {
  const { user: currentUser } = useAuth();
  const { data: allUsers, isLoading: isLoadingUsers, error: usersError } = useAllUsers();
  const createNotificationMutation = useCreateNotification();
  const updateNotificationMutation = useUpdateNotification();

  const isEditMode = !!notification;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'global' | 'specific'>('specific');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSelectOpen, setUserSelectOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEditMode && notification) {
        setTitle(notification.title || '');
        setContent(notification.content || '');
        setTargetType(notification.target_type === 'global' ? 'global' : 'specific');
        setSelectedUserIds(notification.target_user_ids || []);
      } else {
        setTitle('');
        setContent('');
        setTargetType('global'); // Padrão para global ao criar
        setSelectedUserIds([]);
      }
    }
  }, [open, notification, isEditMode]);

  useEffect(() => {
    if (usersError) {
      toast.error("Erro ao carregar usuários", { description: usersError.message });
    }
  }, [usersError]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveNotification = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Preencha todos os campos", { description: "Título e conteúdo do aviso são obrigatórios." });
      return;
    }

    const targetUserList = targetType === 'global' ? (allUsers || []).map(u => u.id) : selectedUserIds;

    if (targetType === 'specific' && targetUserList.length === 0) {
      toast.error("Nenhum usuário selecionado", { description: "Selecione pelo menos um usuário ou escolha a opção 'Global'." });
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      target_type: targetType as Enums<'notification_target_type'>,
      target_user_ids: targetType === 'specific' ? targetUserList : null,
    };

    try {
      if (isEditMode && notification) {
        await updateNotificationMutation.mutateAsync({ id: notification.id, ...payload });
      } else {
        await createNotificationMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error: any) {
      // Erro já tratado pelos onError dos hooks de mutação
    }
  };

  const isLoading = isLoadingUsers || createNotificationMutation.isPending || updateNotificationMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Aviso" : "Criar Novo Aviso"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Ajuste os detalhes do aviso existente." : "Crie um novo aviso para seus assinantes."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do aviso"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva o conteúdo da notificação aqui..."
              rows={5}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label>Alvo</Label>
            <RadioGroup
              value={targetType}
              onValueChange={(value: 'global' | 'specific') => setTargetType(value)}
              className="flex space-x-4"
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="global" />
                <Label htmlFor="global">Global (Todos os usuários)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific" />
                <Label htmlFor="specific">Específico (Selecionar usuários)</Label>
              </div>
            </RadioGroup>
          </div>

          {targetType === 'specific' && (
            <div className="grid gap-2">
              <Label htmlFor="users">Usuários</Label>
              <Popover open={userSelectOpen} onOpenChange={setUserSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSelectOpen}
                    className="w-full justify-between"
                    disabled={isLoadingUsers || isLoading}
                  >
                    {selectedUserIds.length > 0
                      ? `${selectedUserIds.length} usuário(s) selecionado(s)`
                      : "Selecionar usuários..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar usuário..." />
                    <CommandList>
                      {isLoadingUsers ? (
                        <CommandEmpty>Carregando usuários...</CommandEmpty>
                      ) : (allUsers || []).length === 0 ? (
                        <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {(allUsers || []).map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.name}
                              onSelect={() => handleUserSelect(user.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUserIds.includes(user.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user.name} ({user.email})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSaveNotification} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bell className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Salvar Alterações" : "Enviar Aviso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}