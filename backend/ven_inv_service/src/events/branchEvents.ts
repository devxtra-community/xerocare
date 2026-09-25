export enum BranchEventType {
  CREATED = 'branch.created',
  UPDATED = 'branch.updated',
  DELETED = 'branch.deleted',
}

export interface BranchCreatedEvent {
  branchId: string;
  name: string;
  managerId?: string;
  location: string;
  createdAt: string;
}

export interface BranchUpdatedEvent {
  branchId: string;
  // Actual new values for whichever fields changed — undefined/omitted when that field
  // wasn't part of this update. Only name/location are included (matching
  // BranchCreatedEvent's shape for the fields that matter) because branches_mirror
  // (employee_service) only has columns for those two plus status.
  name?: string;
  location?: string;
  updatedFields: string[];
  updatedAt: string;
}

export interface EmployeeEvent {
  employeeId: string;
  email: string;
  role: string;
  status: string;
}
