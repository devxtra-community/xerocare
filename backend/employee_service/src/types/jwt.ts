import { EmployeeJob } from '../constants/employeeJob';

export interface AccessTokenPayload {
  userId: string;
  role: string;
  branchId: string;
  email?: string;
  employeeJob?: EmployeeJob | null;
}
