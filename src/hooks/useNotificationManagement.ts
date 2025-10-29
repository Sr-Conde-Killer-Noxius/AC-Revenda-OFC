import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, Enums } from '@/integrations/supabase/schema';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Define types for convenience
type NotificationRow = Tables<'notifications'>;
type UserNotificationStatusRow = Tables<'user_notification_status'>;

// Type for notifications with creator's name for display
export type NotificationWithCreator = Omit<NotificationRow, 'created_by'> & {
  created_by_name: string; // The name of the user who created the notification
};

// Type for user-specific notifications, including notification details and read status
export type UserNotificationWithDetails = UserNotificationStatusRow & {
  notification: NotificationRow & { created_by_name: string }; // Nested notification details
};

// --- Admin Notification Management Hooks ---

const fetchNotifications = async (): Promise<NotificationWithCreator[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  // Agora que notifications.created_by referencia public.profiles(id), este select deve funcionar.
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      profiles!notifications_created_by_fkey(name) // Seleciona explicitamente o nome da tabela profiles via a chave estrangeira
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    throw new Error(error.message);
  }

  return data.map(n => ({
    ...n,
    created_by_name: (n.profiles as { name: string } | null)?.name || 'Equipe de Desenvolvimento - Digital Soul Solutions',
  }));
};

export const useNotifications = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<NotificationWithCreator[], Error>({
    queryKey: ["notifications", user?.id, role],
    queryFn: fetchNotifications,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60,
  });
};

interface CreateNotificationPayload {
  title: string;
  content: string;
  target_type: Enums<'notification_target_type'>;
  target_user_ids: string[] | null;
}

const createNotification = async (payload: CreateNotificationPayload): Promise<NotificationRow> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...payload,
      created_by: session.user.id, // Usa session.user.id que é também o profile.id
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationRow, Error, CreateNotificationPayload>({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] }); // Invalida notificações do usuário também
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] }); // Invalida contagem de não lidas
      toast.success("Aviso criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar aviso", { description: error.message });
    },
  });
};

interface UpdateNotificationPayload extends CreateNotificationPayload {
  id: string;
}

const updateNotification = async (payload: UpdateNotificationPayload): Promise<NotificationRow> => {
  const { id, ...updateData } = payload;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from('notifications')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const useUpdateNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationRow, Error, UpdateNotificationPayload>({
    mutationFn: updateNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      toast.success("Aviso atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar aviso", { description: error.message });
    },
  });
};

const deleteNotification = async (id: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      toast.success("Aviso excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir aviso", { description: error.message });
    },
  });
};

// --- User Notification Hooks ---

const fetchUserNotifications = async (): Promise<UserNotificationWithDetails[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  const userId = session.user.id;

  // Busca notificações globais e específicas para o usuário
  const { data: globalAndSpecificNotifications, error: notificationsError } = await supabase
    .from('notifications')
    .select(`
      id,
      title,
      content,
      created_at,
      created_by,
      target_type,
      target_user_ids,
      profiles!notifications_created_by_fkey(name)
    `)
    .or(`target_type.eq.global,target_user_ids.cs.{${userId}}`)
    .order('created_at', { ascending: false });

  if (notificationsError) {
    console.error("Error fetching global and specific notifications:", notificationsError);
    throw new Error(notificationsError.message);
  }

  const notificationIds = globalAndSpecificNotifications.map(n => n.id);

  // Busca o status de leitura do usuário para estas notificações
  const { data: userReadStatuses, error: readStatusError } = await supabase
    .from('user_notification_status')
    .select('notification_id, read_at')
    .eq('user_id', userId)
    .in('notification_id', notificationIds);

  if (readStatusError) {
    console.error("Error fetching user notification statuses:", readStatusError);
    throw new Error(readStatusError.message);
  }

  const readStatusMap = new Map(userReadStatuses?.map(s => [s.notification_id, s.read_at]));

  // Combina notificações com seu status de leitura
  const combinedNotifications: UserNotificationWithDetails[] = globalAndSpecificNotifications.map(n => ({
    id: `${n.id}-${userId}`, // ID único para a visualização do usuário desta notificação
    user_id: userId,
    notification_id: n.id,
    read_at: readStatusMap.get(n.id) || null,
    created_at: n.created_at, // Usa created_at da notificação para ordenação
    notification: {
      ...n,
      created_by_name: (n.profiles as { name: string } | null)?.name || 'Equipe de Desenvolvimento - Digital Soul Solutions',
    },
  })).sort((a, b) => new Date(b.notification.created_at).getTime() - new Date(a.notification.created_at).getTime()); // Ordena pela data de criação da notificação

  return combinedNotifications;
};

export const useUserNotifications = () => {
  const { user, isLoading: isLoadingAuth } = useAuth();
  return useQuery<UserNotificationWithDetails[], Error>({
    queryKey: ["userNotifications", user?.id],
    queryFn: fetchUserNotifications,
    enabled: !isLoadingAuth && !!user?.id,
    staleTime: 1000 * 10, // Tempo de stale mais curto para notificações do usuário
  });
};

const fetchUnreadNotificationCount = async (): Promise<number> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return 0;

  const userId = session.user.id;

  // 1. Fetch all relevant notification IDs (global or targeted to the user)
  const { data: relevantNotifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('id')
    .or(`target_type.eq.global,target_user_ids.cs.{${userId}}`);

  if (notificationsError) {
    console.error("Error fetching notifications for unread count:", notificationsError);
    throw new Error(notificationsError.message);
  }

  const relevantNotificationIds = relevantNotifications.map(n => n.id);

  if (relevantNotificationIds.length === 0) {
    return 0; // No relevant notifications, so no unread ones
  }

  // 2. Fetch all user_notification_status entries for the current user for these relevant notifications
  const { data: userReadStatuses, error: readStatusError } = await supabase
    .from('user_notification_status')
    .select('notification_id, read_at')
    .eq('user_id', userId)
    .in('notification_id', relevantNotificationIds);

  if (readStatusError) {
    console.error("Error fetching user notification statuses for unread count:", readStatusError);
    throw new Error(readStatusError.message);
  }

  const readNotificationIds = new Set(
    userReadStatuses
      .filter(status => status.read_at !== null) // Only consider truly read ones
      .map(status => status.notification_id)
  );

  // 3. Count how many relevant notifications are NOT in the readNotificationIds set
  let unreadCount = 0;
  for (const notificationId of relevantNotificationIds) {
    if (!readNotificationIds.has(notificationId)) {
      unreadCount++;
    }
  }

  return unreadCount;
};

export const useUnreadNotificationCount = () => {
  const { user, isLoading: isLoadingAuth } = useAuth();
  return useQuery<number, Error>({
    queryKey: ["unreadNotificationCount", user?.id],
    queryFn: fetchUnreadNotificationCount,
    enabled: !isLoadingAuth && !!user?.id,
    staleTime: 1000 * 5, // Tempo de stale muito curto para a contagem
    refetchInterval: 1000 * 15, // Refetch a cada 15 segundos
  });
};

const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) throw new Error("Usuário não autenticado.");

  const userId = session.user.id;

  // Verifica se já existe uma entrada
  const { data: existingStatus, error: fetchError } = await supabase
    .from('user_notification_status')
    .select('id')
    .eq('user_id', userId)
    .eq('notification_id', notificationId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 significa "nenhuma linha encontrada"
    console.error("Error checking existing notification status:", fetchError);
    throw new Error(fetchError.message);
  }

  if (existingStatus) {
    // Atualiza a entrada existente
    const { error: updateError } = await supabase
      .from('user_notification_status')
      .update({ read_at: new Date().toISOString() })
      .eq('id', existingStatus.id);

    if (updateError) throw new Error(updateError.message);
  } else {
    // Insere nova entrada
    const { error: insertError } = await supabase
      .from('user_notification_status')
      .insert({
        user_id: userId,
        notification_id: notificationId,
        read_at: new Date().toISOString(),
      });

    if (insertError) throw new Error(insertError.message);
  }
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
    onError: (error) => {
      toast.error("Erro ao marcar aviso como lido", { description: "Não foi possível marcar o aviso como lido. Tente novamente." });
    },
  });
};