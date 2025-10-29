import { useState } from 'react';
import { Bell, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useUserNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, UserNotificationWithDetails } from '@/hooks/useNotificationManagement';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils'; // Importar cn

export function NotificationBell() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { data: notifications, isLoading: isLoadingNotifications, error: notificationsError } = useUserNotifications();
  const { data: unreadCount, isLoading: isLoadingUnreadCount, error: unreadCountError } = useUnreadNotificationCount();
  const markAsReadMutation = useMarkNotificationAsRead();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<UserNotificationWithDetails | null>(null);

  const handleNotificationClick = async (notification: UserNotificationWithDetails) => {
    setSelectedNotification(notification);
    setIsDetailDialogOpen(true);
    if (!notification.read_at) {
      await markAsReadMutation.mutateAsync(notification.notification_id); // Mark the actual notification ID as read
    }
  };

  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedNotification(null);
  };

  if (isLoadingAuth || !user) {
    return null; // Não renderiza o sino se não autenticado ou ainda carregando autenticação
  }

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className={cn("h-5 w-5", !isLoadingUnreadCount && unreadCount && unreadCount > 0 && "text-primary animate-pulse")} /> {/* Adicionado destaque visual */}
            {!isLoadingUnreadCount && unreadCount && unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="flex items-center justify-between p-4">
            <h4 className="font-medium text-sm">Avisos ({unreadCount || 0})</h4>
            <Button variant="ghost" size="sm" onClick={() => setIsPopoverOpen(false)}>
              <XCircle className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
          <Separator />
          <ScrollArea className="h-[300px]">
            {isLoadingNotifications ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[220px]" />
              </div>
            ) : notificationsError ? (
              <p className="text-center text-muted-foreground text-xs p-4">Erro ao carregar avisos.</p>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-accent/50 ${!notification.read_at ? 'bg-accent/20 font-medium' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <p className="text-sm">{notification.notification.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.notification.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-xs p-4">Nenhum aviso novo.</p>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedNotification && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          {/* REFACTOR COMPLETO DO DIALOG DE DETALHES DA NOTIFICAÇÃO */}
          <DialogContent className="sm:max-w-[425px] max-h-[90vh]"> {/* Removido 'flex flex-col' */}
            <DialogHeader>
              <DialogTitle>{selectedNotification.notification.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Criado por: {selectedNotification.notification.created_by_name} - {formatDistanceToNow(new Date(selectedNotification.notification.created_at), { addSuffix: true, locale: ptBR })}
              </DialogDescription>
            </DialogHeader>

            {/* ScrollArea com altura máxima calculada explicitamente */}
            {/* A altura '12rem' é uma estimativa para o header e footer. Pode ser ajustada se necessário. */}
            <ScrollArea className="max-h-[calc(90vh-12rem)]">
              {/* O padding é aplicado ao conteúdo interno que será rolado */}
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap break-words">{selectedNotification.notification.content}</p>
              </div>
            </ScrollArea>
            
            {/* O footer permanece fora do ScrollArea */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleCloseDetailDialog}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}