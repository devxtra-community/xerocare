export interface AccessTokenPayload {
  userId: string;
  role: string;
  branchId: string;
  email?: string;
  employeeJob?: string | null;
  financeJob?: string | null;
}
