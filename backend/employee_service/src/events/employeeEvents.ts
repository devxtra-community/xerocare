export enum EmployeeEventType {
  CREATED = 'employee.created',
  UPDATED = 'employee.updated',
  DELETED = 'employee.deleted',
}

export interface EmployeeCreatedEvent {
  employeeId: string;
  email: string;
  role: string;
  status: string;
  name: string;
}

export interface EmployeeUpdatedEvent {
  employeeId: string;
  email: string;
  role: string;
  status: string;
  name: string;
}

export interface EmployeeDeletedEvent {
  employeeId: string;
}
