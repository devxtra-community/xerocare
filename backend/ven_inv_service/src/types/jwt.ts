export interface AccessTokenPayload {
  userId: string;
  role: string;
  email?: string;
  branchId?: string;
  employeeJob?: string | null;
  financeJob?: string | null;
}
