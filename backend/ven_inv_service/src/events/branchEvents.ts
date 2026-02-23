export enum BranchEventType {
  CREATED = 'branch.created',
  UPDATED = 'branch.updated',
  DELETED = 'branch.deleted',
}

export interface BranchCreatedEvent {
  branchId: string;
  name: string;
  managerId: string;
  location: string;
  createdAt: string;
}

export interface BranchUpdatedEvent {
  branchId: string;
  updatedFields: string[];
  updatedAt: string;
}

export interface EmployeeEvent {
  employeeId: string;
  email: string;
  role: string;
  status: string;
}
