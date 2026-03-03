export enum EmployeeJob {
  SALES = 'SALES',
  CRM = 'CRM',
  RENT = 'RENT',
  LEASE = 'LEASE',
  EMPLOYEE_MANAGER = 'EMPLOYEE_MANAGER',
}

export const EMPLOYEE_JOB_LABELS: Record<EmployeeJob, string> = {
  [EmployeeJob.SALES]: 'Sales',
  [EmployeeJob.CRM]: 'CRM',
  [EmployeeJob.RENT]: 'Rent',
  [EmployeeJob.LEASE]: 'Lease',
  [EmployeeJob.EMPLOYEE_MANAGER]: 'Employee Manager',
};

// Single source of truth for job-to-module mapping (mirrors backend)
export const EMPLOYEE_JOB_ACCESS: Record<EmployeeJob, string[]> = {
  [EmployeeJob.SALES]: ['sales', 'billing', 'customers'],
  [EmployeeJob.CRM]: ['crm', 'customers'],
  [EmployeeJob.RENT]: ['rent', 'reading', 'billing'],
  [EmployeeJob.LEASE]: ['lease', 'billing'],
  [EmployeeJob.EMPLOYEE_MANAGER]: ['*'], // Access all employee modules
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
