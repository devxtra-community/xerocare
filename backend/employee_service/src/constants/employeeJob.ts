export enum EmployeeJob {
  SALES = 'SALES',
  RENT_LEASE = 'RENT_LEASE',
  CRM = 'CRM',
  TECHNICIAN = 'TECHNICIAN',
  DELIVERY = 'DELIVERY',
  READING_AGENT = 'READING_AGENT',
  MULTI_ROLE = 'MULTI_ROLE',
}

// Single source of truth for job-to-module mapping
export const EMPLOYEE_JOB_ACCESS: Record<EmployeeJob, string[]> = {
  [EmployeeJob.SALES]: ['sales', 'billing', 'customers'],
  [EmployeeJob.RENT_LEASE]: ['rent', 'lease', 'reading', 'billing'],
  [EmployeeJob.CRM]: ['crm', 'customers'],
  [EmployeeJob.TECHNICIAN]: ['service', 'repair', 'maintenance'],
  [EmployeeJob.DELIVERY]: ['delivery', 'installation'],
  [EmployeeJob.READING_AGENT]: ['reading', 'meters'],
  [EmployeeJob.MULTI_ROLE]: ['*'], // Access all modules
};

// Helper function to check if a job has access to a module
export function hasJobAccess(job: EmployeeJob, module: string): boolean {
  const allowedModules = EMPLOYEE_JOB_ACCESS[job];
  return allowedModules.includes('*') || allowedModules.includes(module);
}
