import { EmployeeJob } from '../constants/employeeJob';
import { FinanceJob } from '../constants/financeJob';

export interface AccessTokenPayload {
  userId: string;
  role: string;
  branchId: string;
  email?: string;
  employeeJob?: EmployeeJob | null;
  financeJob?: FinanceJob | null;
}
