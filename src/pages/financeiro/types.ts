export interface Kpis {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  monthlyGrowthPercentage: number;
  newClientsThisMonth: number;
  activeClients: number;
  revenueForecast: number; // Adicionado
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface MonthlyRevenueHistory {
  month: string;
  revenue: number;
}

export interface WeeklyRevenue {
  [key: string]: {
    currentMonth: number;
    previousMonth: number;
  };
}

export interface RevenueByPlan {
  planName: string;
  totalRevenue: number;
}

export interface ChurnByPlan {
  planName: string;
  lostCount: number;
}

export interface ChurnAnalysis {
  lostClientsThisMonth: number;
  lostRevenueThisMonth: number;
  churnRate: number;
  churnByPlan: ChurnByPlan[];
}

export interface FinancialAnalysis {
  kpis: Kpis;
  revenueLast30Days: RevenueData[];
  monthlyRevenueHistory: MonthlyRevenueHistory[];
  weeklyRevenueComparison: WeeklyRevenue;
  revenueByPlan: RevenueByPlan[];
  churnAnalysis: ChurnAnalysis;
}