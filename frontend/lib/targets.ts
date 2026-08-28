import api from './api';

export type TargetType = 'SALES' | 'RENT_LEASE' | 'SERVICE';
export type TargetStatusValue = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface TargetTier {
  fromPercent: number;
  toPercent: number | null;
  incentivePercent: number;
}

export interface EmployeeTarget {
  id: string;
  employeeId: string;
  branchId: string;
  assignedBy: string;
  targetMonth: string;
  targetAmount: number;
  targetType: TargetType;
  currencyCode: string;
  tiers: TargetTier[];
  status: TargetStatusValue;
  createdAt: string;
}

export interface TargetAchievement {
  id: string;
  targetId: string;
  employeeId: string;
  branchId: string;
  targetMonth: string;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  appliedTierPercent: number;
  incentiveAmount: number;
  dealCount: number;
  calculatedAt: string;
  isFinalized: boolean;
}

export interface AchievementRecordRow {
  id: string;
  label: string;
  amount: number;
  date: string;
}

export interface TargetWithAchievement {
  target: EmployeeTarget;
  achievement: TargetAchievement;
  records: AchievementRecordRow[];
  rank?: number | null;
  /** Present when the caller can see across branches (ADMIN); null if not resolvable. */
  branchName?: string | null;
}

export interface LeaderboardRow extends TargetWithAchievement {
  rank: number;
}

export const createTarget = async (payload: {
  employeeId: string;
  targetMonth: string;
  targetAmount: number;
  tiers: TargetTier[];
}): Promise<EmployeeTarget> => {
  const res = await api.post('/b/targets', payload);
  return res.data.data;
};

export const listTargets = async (params: {
  month?: string;
  employeeId?: string;
  branchId?: string;
}): Promise<EmployeeTarget[]> => {
  const res = await api.get('/b/targets', { params });
  return res.data.data;
};

export const getTargetById = async (id: string): Promise<TargetWithAchievement> => {
  const res = await api.get(`/b/targets/${id}`);
  return res.data.data;
};

export const updateTarget = async (
  id: string,
  payload: { targetAmount?: number; tiers?: TargetTier[] },
): Promise<EmployeeTarget> => {
  const res = await api.put(`/b/targets/${id}`, payload);
  return res.data.data;
};

export const cancelTarget = async (id: string): Promise<EmployeeTarget> => {
  const res = await api.delete(`/b/targets/${id}`);
  return res.data.data;
};

export const listTargetsByEmployee = async (
  employeeId: string,
): Promise<TargetWithAchievement[]> => {
  const res = await api.get(`/b/targets/employee/${employeeId}`);
  return res.data.data;
};

export const monthlyAchievement = async (
  month: string,
  params?: { branchId?: string; search?: string },
): Promise<TargetWithAchievement[]> => {
  const res = await api.get('/b/targets/achievement/monthly', {
    params: { month, branchId: params?.branchId, search: params?.search },
  });
  return res.data.data;
};

export const getMyTargets = async (): Promise<TargetWithAchievement[]> => {
  const res = await api.get('/b/targets/my-targets');
  return res.data.data;
};

export const getMyTargetMonth = async (month: string): Promise<TargetWithAchievement> => {
  const res = await api.get(`/b/targets/my-targets/${month}`);
  return res.data.data;
};

export const getLeaderboard = async (
  month: string,
  params?: { branchId?: string; search?: string },
): Promise<LeaderboardRow[]> => {
  const res = await api.get('/b/targets/leaderboard', {
    params: { month, branchId: params?.branchId, search: params?.search },
  });
  return res.data.data;
};

export interface EmployeeMonthlyActivity {
  employeeId: string;
  salesCount: number;
  salesRevenue: number;
  rentCount: number;
  rentRevenue: number;
  leaseCount: number;
  leaseRevenue: number;
  totalRevenue: number;
}

export const getBranchMonthlyActivity = async (
  month: string,
  params?: { branchId?: string },
): Promise<EmployeeMonthlyActivity[]> => {
  const res = await api.get('/b/targets/branch-activity/monthly', {
    params: { month, branchId: params?.branchId },
  });
  return res.data.data;
};

export const getAdminOverview = async (params: {
  branchId?: string;
  month?: string;
  targetType?: string;
}): Promise<TargetWithAchievement[]> => {
  const res = await api.get('/b/targets/admin/overview', { params });
  return res.data.data;
};
