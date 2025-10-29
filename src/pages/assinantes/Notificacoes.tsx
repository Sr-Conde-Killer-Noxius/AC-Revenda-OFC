import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Bell, Loader2, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { AdminNotificationCrudDialog } from "@/components/admin/assinantes/AdminNotificationCrudDialog"; // NOVO: Importar o diálogo de CRUD
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Enums } from '@/integrations/supabase/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteNotification, NotificationWithCreator } from '@/hooks/useNotificationManagement'; // Importar useDeleteNotification e NotificationWithCreator

export default function AdminNotificacoes() {
  const { user: currentUser, role } = useAuth();
  const deleteNotificationMutation = useDeleteNotification();

  const [isCrudDialogOpen, setIsCrudDialogOpen] = useState(false); // Para o diálogo de CRUD (criar/editar)
  const [selectedNotificationToEdit, setSelectedNotificationToEdit] = useState<NotificationWithCreator | null>(null);
  const [notifications, setNotifications] = useState<NotificationWithCreator[]>([]); // Usar NotificationWithCreator
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<NotificationWithCreator | null>(null);

  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    if (!currentUser?.id || role !== 'admin') {
      setNotifications([]);
      setIsLoadingNotifications(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        title,
        content,
        target_type,
        target_user_ids,
        created_at,
        created_by,
        profiles!notifications_created_by_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar avisos", { description: error.message });
      setNotifications([]);
    } else {
      setNotifications(data.map(n => ({
        ...n,
        created_by_name: (n.profiles as { name: string } | null)?.name || 'Desconhecido',
      })) || []);
    }
    setIsLoadingNotifications(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser?.id, role]);

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (notification.created_by_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleOpenCrudDialog = (notification?: NotificationWithCreator) => {
    setSelectedNotificationToEdit(notification || null);
    setIsCrudDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return;

    try {
      await deleteNotificationMutation.mutateAsync(notificationToDelete.id);
      toast.success("Aviso excluído!", { description: "O aviso foi removido com sucesso." });
      fetchNotifications(); // Atualiza a lista após a exclusão
    } catch (error: any) {
      toast.error("Erro ao excluir aviso", { description: error.message });
    } finally {
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gerenciar Avisos</h1>
        <p className="text-muted-foreground mt-1">Crie e visualize avisos para seus assinantes.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, conteúdo ou criador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <Button onClick={() => handleOpenCrudDialog()} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Criar Novo Aviso
        </Button>
      </div>

      {isLoadingNotifications ? (
        <Card className="border-border bg-card">
          <CardContent className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm ml-2">Carregando avisos...</p>
          </CardContent>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center text-sm">
              Nenhum aviso encontrado. Crie seu primeiro aviso!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Título</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Conteúdo</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Alvo</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Criado Por</TableHead>
                <TableHead className="whitespace-nowrap text-xs sm:text-sm">Data de Criação</TableHead>
                <TableHead className="w-[50px] text-xs sm:text-sm">Ações</TableHead> {/* NOVA COLUNA */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{notification.title}</TableCell>
                  <TableCell className="text-xs sm:text-sm max-w-[300px] truncate">{notification.content}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <Badge variant={notification.target_type === 'global' ? 'default' : 'secondary'}>
                      {notification.target_type === 'global' ? 'Global' : 'Específico'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">{notification.created_by_name || 'Desconhecido'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenCrudDialog(notification)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setNotificationToDelete(notification);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AdminNotificationCrudDialog
        open={isCrudDialogOpen}
        onOpenChange={(open) => {
          setIsCrudDialogOpen(open);
          if (!open) {
            setSelectedNotificationToEdit(null); // Limpa o aviso selecionado ao fechar
            fetchNotifications(); // Atualiza a lista após o diálogo fechar
          }
        }}
        notification={selectedNotificationToEdit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Confirmar exclusão de aviso</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir o aviso "{notificationToDelete?.title}"? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
              disabled={deleteNotificationMutation.isPending}
            >
              {deleteNotificationMutation.isPending ? "Excluindo..." : "Excluir Aviso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}