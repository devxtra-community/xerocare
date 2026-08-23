export enum EmployeeJob {
  SALES = 'SALES',
  CRM = 'CRM',
  RENT_AND_LEASE = 'RENT_AND_LEASE',
  MANAGER = 'MANAGER',
  SERVICE_HELP_DESK = 'SERVICE_HELP_DESK',
  SERVICE_TECHNICIAN = 'SERVICE_TECHNICIAN',
}

export const EMPLOYEE_JOB_LABELS: Record<EmployeeJob, string> = {
  [EmployeeJob.SALES]: 'Sales',
  [EmployeeJob.CRM]: 'CRM',
  [EmployeeJob.RENT_AND_LEASE]: 'Rent & Lease',
  [EmployeeJob.MANAGER]: 'Manager',
  [EmployeeJob.SERVICE_HELP_DESK]: 'Service Help Desk',
  [EmployeeJob.SERVICE_TECHNICIAN]: 'Service Technician',
};

// Single source of truth for job-to-module mapping (mirrors backend)
export const EMPLOYEE_JOB_ACCESS: Record<EmployeeJob, string[]> = {
  [EmployeeJob.SALES]: ['sales', 'billing', 'customers'],
  [EmployeeJob.CRM]: ['crm', 'customers'],
  [EmployeeJob.RENT_AND_LEASE]: ['rent', 'lease', 'reading', 'billing'],
  [EmployeeJob.MANAGER]: ['*'], // Access all employee modules
  [EmployeeJob.SERVICE_HELP_DESK]: ['service', 'service_desk', 'customers', 'crm'],
  // Service technicians own meter readings as well as service tickets — the old
  // standalone TECHNICIAN job was folded into this one.
  [EmployeeJob.SERVICE_TECHNICIAN]: ['service', 'reading'],
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
