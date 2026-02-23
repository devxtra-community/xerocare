export enum FinanceJob {
  FINANCE_SALES = 'FINANCE_SALES',
  FINANCE_RENT = 'FINANCE_RENT',
  FINANCE_LEASE = 'FINANCE_LEASE',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  FINANCE_RENT_LEASE = 'FINANCE_RENT_LEASE',
}

// Single source of truth for finance job-to-module mapping
export const FINANCE_JOB_ACCESS: Record<FinanceJob, string[]> = {
  [FinanceJob.FINANCE_SALES]: ['sales', 'billing'],
  [FinanceJob.FINANCE_RENT]: ['rent', 'billing'],
  [FinanceJob.FINANCE_LEASE]: ['lease', 'billing'],
  [FinanceJob.FINANCE_MANAGER]: ['*'], // Access all finance modules
  [FinanceJob.FINANCE_RENT_LEASE]: ['rent', 'lease', 'billing'],
};

// Helper function to check if a finance job has access to a module
export function hasFinanceJobAccess(job: FinanceJob, module: string): boolean {
  const allowedModules = FINANCE_JOB_ACCESS[job];
  return allowedModules.includes('*') || allowedModules.includes(module);
}
