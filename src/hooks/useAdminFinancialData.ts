import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// @ts-ignore
import { AdminFinancialEntry, AdminFinancialEntryInsert, AdminFinancialEntryUpdate, TransactionType } from '@/integrations/supabase/schema';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

// --- Interfaces para dados de resumo e análise ---
export interface AdminFinancialSummary {
  receivedToday: number;
  receivedThisWeek: number;
  receivedThisMonth: number;
  receivableToday: number;
  receivableTomorrow: number;
  receivableThisWeek: number;
  receivableThisMonth: number;
  lostValueToday: number;
  lostValueThisWeek: number;
  lostValueThisMonth: number;
}

export interface AdminKpis {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  monthlyGrowthPercentage: number;
  newSubscribersThisMonth: number;
  activeSubscribers: number;
  revenueForecast: number;
}

export interface AdminRevenueData {
  date: string;
  revenue: number;
}

export interface AdminMonthlyRevenueHistory {
  month: string;
  revenue: number;
}

export interface AdminWeeklyRevenue {
  [key: string]: {
    currentMonth: number;
    previousMonth: number;
  };
}

export interface AdminRevenueByPlan {
  planName: string;
  totalRevenue: number;
}

export interface AdminChurnByPlan {
  planName: string;
  lostCount: number;
}

export interface AdminChurnAnalysis {
  lostSubscribersThisMonth: number;
  lostRevenueThisMonth: number;
  churnRate: number;
  churnByPlan: AdminChurnByPlan[];
}

export interface AdminFinancialAnalysis {
  kpis: AdminKpis;
  revenueLast30Days: AdminRevenueData[];
  monthlyRevenueHistory: AdminMonthlyRevenueHistory[];
  weeklyRevenueComparison: AdminWeeklyRevenue;
  revenueByPlan: AdminRevenueByPlan[];
  churnAnalysis: AdminChurnAnalysis;
}

const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";

// --- Fetch Admin Financial Summary ---
const fetchAdminFinancialSummary = async (): Promise<AdminFinancialSummary> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "admin-financial-summary";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar resumo financeiro administrativo.");
  }

  return response.json();
};

export const useAdminFinancialSummary = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<AdminFinancialSummary, Error>({
    queryKey: ["adminFinancialSummary", user?.id, role],
    queryFn: fetchAdminFinancialSummary,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60 * 5,
  });
};

// --- Fetch Admin Financial Analysis ---
const fetchAdminFinancialAnalysis = async (): Promise<AdminFinancialAnalysis> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "admin-financial-analysis";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar análise financeira administrativa.");
  }

  return response.json();
};

export const useAdminFinancialAnalysis = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<AdminFinancialAnalysis, Error>({
    queryKey: ["adminFinancialAnalysis", user?.id, role],
    queryFn: fetchAdminFinancialAnalysis,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60 * 5,
  });
};

// --- Fetch Admin Financial Entries (CRUD) ---
const fetchAdminFinancialEntries = async (): Promise<AdminFinancialEntry[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "admin-financial-entries";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao buscar extrato financeiro administrativo.");
  }

  return response.json();
};

export const useAdminFinancialEntries = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth();
  return useQuery<AdminFinancialEntry[], Error>({
    queryKey: ["adminFinancialEntries", user?.id, role],
    queryFn: fetchAdminFinancialEntries,
    enabled: !isLoadingAuth && !!user?.id && role === 'admin',
    staleTime: 1000 * 60,
  });
};

// --- Create Admin Financial Entry ---
const createAdminFinancialEntry = async (newEntry: AdminFinancialEntryInsert): Promise<AdminFinancialEntry> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "admin-financial-entries";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(newEntry),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao criar lançamento financeiro administrativo.");
  }

  return response.json();
};

export const useCreateAdminFinancialEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<AdminFinancialEntry, Error, AdminFinancialEntryInsert>({
    mutationFn: createAdminFinancialEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinancialEntries'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis'] });
      toast.success("Lançamento financeiro administrativo criado com sucesso!");
    },
    onError: (_error) => {
      toast.error("Erro ao criar lançamento financeiro administrativo", { description: "Não foi possível criar o lançamento financeiro administrativo. Tente novamente." });
    },
  });
};

// --- Update Admin Financial Entry ---
const updateAdminFinancialEntry = async (updatedEntry: AdminFinancialEntryUpdate & { id: string }): Promise<AdminFinancialEntry> => {
  const { id, ...updateData } = updatedEntry;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "admin-financial-entries";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}?id=${id}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao atualizar lançamento financeiro administrativo.");
  }

  return response.json();
};

export const useUpdateAdminFinancialEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<AdminFinancialEntry, Error, AdminFinancialEntryUpdate & { id: string }>({
    mutationFn: updateAdminFinancialEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinancialEntries'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis'] });
      toast.success("Lançamento financeiro administrativo atualizado com sucesso!");
    },
    onError: (_error) => {
      toast.error("Erro ao atualizar lançamento financeiro administrativo", { description: "Não foi possível atualizar o lançamento financeiro administrativo. Tente novamente." });
    },
  });
};

// --- Delete Admin Financial Entry ---
const deleteAdminFinancialEntry = async (id: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const EDGE_FUNCTION_NAME = "admin-financial-entries";
  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}?id=${id}`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erro ao excluir lançamento financeiro administrativo.");
  }
};

export const useDeleteAdminFinancialEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteAdminFinancialEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinancialEntries'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinancialAnalysis'] });
      toast.success("Lançamento financeiro administrativo excluído com sucesso!");
    },
    onError: (_error) => {
      toast.error("Erro ao excluir lançamento financeiro administrativo", { description: "Não foi possível excluir o lançamento financeiro administrativo. Tente novamente." });
    },
  });
};