import api from './api';

export interface ExpenseRequest {
  id: string;
  requestNo: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  branchId: string;
  branchName: string;
  date: string;
  category: string;
  subCategory?: string;
  description: string;
  amount: number;
  currency: string;
  receiptUrl?: string;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  paidFromAccount?: string;
  paymentReference?: string;
  expenseEntryId?: string;
  notes?: string;
  // Manager purchase payment fields
  requestSource?: 'EMPLOYEE_EXPENSE' | 'MANAGER_PURCHASE';
  purchaseId?: string;
  purchaseRef?: string;
  vendorName?: string;
  /** DOMESTIC (local) or INTERNATIONAL — snapshotted from the purchase */
  purchaseOrigin?: string;
  paymentMode?: string;
  paidFromAccountId?: string;
  purchasePaymentId?: string;
  chequeNumber?: string;
  chequeBankName?: string;
  chequeDueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequestSummary {
  pending: { count: number; total_amount: number };
  submitted: { count: number; total_amount: number };
  approved: { count: number; total_amount: number };
  rejected: { count: number; total_amount: number };
  paid: { count: number; total_amount: number };
  by_category: { category: string; total: number; count: number }[];
  by_employee: { employee_name: string; total: number; count: number }[];
  this_month_total: number;
}

export interface CreateExpenseRequestPayload {
  date: string;
  category: string;
  sub_category?: string;
  description: string;
  amount: number;
  currency?: string;
  receipt_url?: string;
  notes?: string;
}

const BASE = '/b/expenses/requests';

export const createExpenseRequest = (data: CreateExpenseRequestPayload): Promise<ExpenseRequest> =>
  api.post(BASE, data).then((r) => r.data.data);

export const getMyExpenseRequests = (filters?: {
  status?: string;
  category?: string;
  from?: string;
  to?: string;
  /** ADMIN role only — server ignores this for other roles (branch-scoped by JWT instead). */
  branchId?: string;
}): Promise<ExpenseRequest[]> => api.get(BASE, { params: filters }).then((r) => r.data.data);

export const getExpenseRequest = (id: string): Promise<ExpenseRequest> =>
  api.get(`${BASE}/${id}`).then((r) => r.data.data);

export const updateExpenseRequest = (
  id: string,
  data: Partial<CreateExpenseRequestPayload>,
): Promise<ExpenseRequest> => api.patch(`${BASE}/${id}`, data).then((r) => r.data.data);

export const deleteExpenseRequest = (id: string): Promise<void> =>
  api.delete(`${BASE}/${id}`).then((r) => r.data);

export const submitExpenseRequest = (id: string): Promise<ExpenseRequest> =>
  api.post(`${BASE}/${id}/submit`).then((r) => r.data.data);

export const approveExpenseRequest = (
  id: string,
  data?: { paid_from_account?: string; payment_reference?: string; notes?: string },
): Promise<ExpenseRequest> => api.post(`${BASE}/${id}/approve`, data).then((r) => r.data.data);

export const rejectExpenseRequest = (
  id: string,
  rejection_reason: string,
): Promise<ExpenseRequest> =>
  api.post(`${BASE}/${id}/reject`, { rejection_reason }).then((r) => r.data.data);

export const payExpenseRequest = (
  id: string,
  data: {
    paid_from_account?: string;
    payment_reference?: string;
    payment_mode?: string;
    cheque_number?: string;
    cheque_bank_name?: string;
    cheque_due_date?: string;
    notes?: string;
  },
): Promise<ExpenseRequest> => api.post(`${BASE}/${id}/pay`, data).then((r) => r.data.data);

export const getExpenseRequestSummary = (filters?: {
  branchIds?: string;
  from?: string;
  to?: string;
}): Promise<ExpenseRequestSummary> =>
  api.get(`${BASE}/summary`, { params: filters }).then((r) => r.data.data);

export interface ManagerPurchasePaymentRequestPayload {
  purchaseId: string;
  purchaseRef?: string;
  vendorName?: string;
  amount: number;
  paymentMethod: string;
  paidFromAccountId?: string;
  chequeNumber?: string;
  chequeBankName?: string;
  chequeDueDate?: string;
  description?: string;
  referenceNumber?: string;
  paymentDate?: string;
  currency?: string;
}

export const createManagerPurchasePaymentRequest = (
  data: ManagerPurchasePaymentRequestPayload,
  proofFile?: File | null,
): Promise<ExpenseRequest> => {
  // Multipart so the Manager's payment proof (image/PDF) uploads with the request.
  const form = new FormData();
  // purchaseId first — the upload middleware keys the R2 path off it.
  form.append('purchaseId', data.purchaseId);
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'purchaseId' || value === undefined || value === null) return;
    form.append(key, String(value));
  });
  if (proofFile) form.append('proof', proofFile);
  return api.post(`${BASE}/manager-purchase`, form).then((r) => r.data.data);
};
