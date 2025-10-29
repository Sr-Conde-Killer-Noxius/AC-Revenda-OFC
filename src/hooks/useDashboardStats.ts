import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface Stats {
  totalClients: number;
  activeClients: number;
  totalPlans: number;
  overdueClients: number;
  migrationNeeded?: boolean;
}

const fetchDashboardStats = async (userId: string, userRole: string | null): Promise<Stats> => {
  let clientsQuery = supabase.from("clients").select("*", { count: "exact" });
  let plansQuery = supabase.from("plans").select("*", { count: "exact" });

  // Apply filter ONLY if the user is NOT an admin
  if (userRole !== 'admin') {
    clientsQuery = clientsQuery.eq("user_id", userId);
    plansQuery = plansQuery.eq("user_id", userId);
  }

  const [clientsResult, plansResult] = await Promise.all([
    clientsQuery,
    plansQuery,
  ]);

  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (plansResult.error) throw new Error(plansResult.error.message);

  const clients = clientsResult.data || [];
  const activeClients = clients.filter((c) => c.status === "active").length;
  const overdueClients = clients.filter((c) => c.status === "overdue").length;

  // Check if schema migration is needed
  try {
    await supabase.functions.invoke('apply-schema-migration');
  } catch (error) {
    console.log('Migration check:', error);
  }

  return {
    totalClients: clientsResult.count || 0,
    activeClients,
    totalPlans: plansResult.count || 0,
    overdueClients,
  };
};

export const useDashboardStats = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth(); // Get user and role from AuthContext

  return useQuery<Stats, Error>({
    queryKey: ['dashboardStats', user?.id, role], // Add role to query key
    queryFn: () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return fetchDashboardStats(user.id, role);
    },
    enabled: !isLoadingAuth && !!user?.id, // Only enable if auth is loaded and user is present
    staleTime: 1000 * 60, // 1 minuto de cache
  });
};