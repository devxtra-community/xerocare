export enum EmployeeJob {
  SALES = 'SALES',
  RENT_LEASE = 'RENT_LEASE',
  CRM = 'CRM',
  MANAGER = 'MANAGER',
}

export const EMPLOYEE_JOB_LABELS: Record<EmployeeJob, string> = {
  [EmployeeJob.SALES]: 'Sales',
  [EmployeeJob.RENT_LEASE]: 'Rent & Lease',
  [EmployeeJob.CRM]: 'CRM',
  [EmployeeJob.MANAGER]: 'Manager',
};

// Single source of truth for job-to-module mapping (mirrors backend)
export const EMPLOYEE_JOB_ACCESS: Record<EmployeeJob, string[]> = {
  [EmployeeJob.SALES]: ['sales', 'billing', 'customers'],
  [EmployeeJob.RENT_LEASE]: ['rent', 'lease', 'reading', 'billing'],
  [EmployeeJob.CRM]: ['crm', 'customers'],
  [EmployeeJob.MANAGER]: ['*'], // Access all modules
};

// Helper function to check if a job has access to a module
export function hasJobAccess(job: EmployeeJob, module: string): boolean {
  const allowedModules = EMPLOYEE_JOB_ACCESS[job] || [];
  return allowedModules.includes('*') || allowedModules.includes(module);
}

// Get all job options for dropdown
export function getEmployeeJobOptions() {
  return Object.values(EmployeeJob).map((job) => ({
    value: job,
    label: EMPLOYEE_JOB_LABELS[job],
  }));
}
