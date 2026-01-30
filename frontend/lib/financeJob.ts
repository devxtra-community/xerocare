export enum FinanceJob {
  FINANCE_SALES = 'FINANCE_SALES',
  FINANCE_RENT_LEASE = 'FINANCE_RENT_LEASE',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
}

export const FINANCE_JOB_LABELS: Record<FinanceJob, string> = {
  [FinanceJob.FINANCE_SALES]: 'Finance - Sales',
  [FinanceJob.FINANCE_RENT_LEASE]: 'Finance - Rent & Lease',
  [FinanceJob.FINANCE_MANAGER]: 'Finance Manager',
};

// Single source of truth for finance job-to-module mapping (mirrors backend)
export const FINANCE_JOB_ACCESS: Record<FinanceJob, string[]> = {
  [FinanceJob.FINANCE_SALES]: ['sales', 'billing'],
  [FinanceJob.FINANCE_RENT_LEASE]: ['rent', 'lease', 'billing'],
  [FinanceJob.FINANCE_MANAGER]: ['*'], // Access all finance modules
};

// Helper function to check if a finance job has access to a module
export function hasFinanceJobAccess(job: FinanceJob, module: string): boolean {
  const allowedModules = FINANCE_JOB_ACCESS[job];
  return allowedModules.includes('*') || allowedModules.includes(module);
}

// Get all finance job options for dropdown
export function getFinanceJobOptions() {
  return Object.values(FinanceJob).map((job) => ({
    value: job,
    label: FINANCE_JOB_LABELS[job],
  }));
}
