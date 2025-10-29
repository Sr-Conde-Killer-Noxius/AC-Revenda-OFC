import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, ProfileUpdate, AppSubscriptionStatus } from '@/integrations/supabase/schema';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

// Função para buscar o perfil do usuário
const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, external_id')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
    throw error;
  }
  return data as unknown as Profile | null;
};

export const useUserProfile = () => {
  const { user, isLoading: isLoadingAuth } = useAuth();
  return useQuery<Profile | null, Error>({
    queryKey: ['userProfile', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      return fetchUserProfile(user.id);
    },
    enabled: !isLoadingAuth && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Função para buscar o perfil e a assinatura do usuário
interface ProfileAndSubscription extends Profile {
  subscription: {
    id: string;
    plan_name: string;
    price: number;
    status: AppSubscriptionStatus;
    next_billing_date: string | null;
    isFree: boolean; // Adicionado isFree aqui
  } | null;
}

const fetchProfileAndSubscription = async (userId: string): Promise<ProfileAndSubscription | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      external_id,
      subscriptions(id, plan_name, price, status, next_billing_date)
    `)
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) return null;

  const typedData = data as unknown as Profile & { subscriptions: any | any[] };

  let subscription = Array.isArray(typedData.subscriptions) ? typedData.subscriptions[0] : typedData.subscriptions;

  if (subscription && subscription.plan_name) {
    const { data: planDetails, error: planDetailsError } = await supabase
      .from('subscriber_plans')
      .select('is_free')
      .eq('name', subscription.plan_name)
      .single();

    if (planDetailsError && planDetailsError.code !== 'PGRST116') {
      console.error('Error fetching plan details for subscription:', planDetailsError);
    } else {
      subscription = {
        ...subscription,
        isFree: planDetails?.is_free || false,
      };
    }
  } else if (subscription) {
    // Se não houver plan_name, assume que não é gratuito ou não tem detalhes de plano
    subscription = {
      ...subscription,
      isFree: false,
    };
  }


  return {
    ...typedData,
    subscription: subscription || null,
  } as ProfileAndSubscription;
};

export const useProfileAndSubscription = () => {
  const { user, isLoading: isLoadingAuth } = useAuth();
  return useQuery<ProfileAndSubscription | null, Error>({
    queryKey: ['profileAndSubscription', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      return fetchProfileAndSubscription(user.id);
    },
    enabled: !isLoadingAuth && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};


// Função para atualizar o perfil do usuário
const updateProfile = async (profileData: ProfileUpdate): Promise<Profile> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id)
    .select('*, external_id')
    .single();

  if (error) throw error;
  return data as unknown as Profile;
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation<Profile, Error, ProfileUpdate>({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profileAndSubscription', user?.id] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar perfil", { description: error.message });
    },
  });
};