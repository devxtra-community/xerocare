export enum EmployeeJob {
  SALES = 'SALES',
  CRM = 'CRM',
  RENT_AND_LEASE = 'RENT_AND_LEASE',
  MANAGER = 'MANAGER',
}

// Single source of truth for job-to-module mapping
export const EMPLOYEE_JOB_ACCESS: Record<EmployeeJob, string[]> = {
  [EmployeeJob.SALES]: ['sales', 'billing', 'customers'],
  [EmployeeJob.CRM]: ['crm', 'customers'],
  [EmployeeJob.RENT_AND_LEASE]: ['rent', 'lease', 'reading', 'billing'],
  [EmployeeJob.MANAGER]: ['*'], // Access all employee modules
};

// Helper function to check if a job has access to a module
export function hasJobAccess(job: EmployeeJob, module: string): boolean {
  const allowedModules = EMPLOYEE_JOB_ACCESS[job];
  return allowedModules.includes('*') || allowedModules.includes(module);
}
