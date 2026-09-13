import api from './api';

export type EmployeeDocumentType =
  | 'PASSPORT'
  | 'EMIRATES_ID'
  | 'QATAR_ID'
  | 'NATIONAL_ID'
  | 'VISA'
  | 'RESIDENCE_PERMIT'
  | 'LABOUR_CONTRACT'
  | 'WORK_PERMIT'
  | 'DRIVING_LICENSE'
  | 'HEALTH_CARD'
  | 'INSURANCE'
  | 'CERTIFICATE'
  | 'OTHER';

export const EMPLOYEE_DOCUMENT_TYPE_LABELS: Record<EmployeeDocumentType, string> = {
  PASSPORT: 'Passport',
  EMIRATES_ID: 'Emirates ID',
  QATAR_ID: 'Qatar ID',
  NATIONAL_ID: 'National ID',
  VISA: 'Visa',
  RESIDENCE_PERMIT: 'Residence Permit',
  LABOUR_CONTRACT: 'Labour Contract',
  WORK_PERMIT: 'Work Permit',
  DRIVING_LICENSE: 'Driving License',
  HEALTH_CARD: 'Health Card',
  INSURANCE: 'Insurance',
  CERTIFICATE: 'Certificate',
  OTHER: 'Other',
};

export const EMPLOYEE_DOCUMENT_TYPE_OPTIONS = (
  Object.keys(EMPLOYEE_DOCUMENT_TYPE_LABELS) as EmployeeDocumentType[]
).map((value) => ({ value, label: EMPLOYEE_DOCUMENT_TYPE_LABELS[value] }));

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  doc_type: EmployeeDocumentType;
  label: string | null;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_key: string;
  file_name: string | null;
  file_mime: string | null;
  uploaded_by: string | null;
  createdAt: string;
  updatedAt: string;
  /** Short-lived signed link for viewing/downloading. */
  viewUrl: string | null;
}

export interface NewEmployeeDocumentInput {
  file: File;
  docType: EmployeeDocumentType;
  label?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
}

export const listEmployeeDocuments = async (employeeId: string): Promise<EmployeeDocument[]> => {
  const res = await api.get(`/e/employee/${employeeId}/documents`);
  return res.data.data;
};

export const uploadEmployeeDocument = async (
  employeeId: string,
  input: NewEmployeeDocumentInput,
): Promise<EmployeeDocument> => {
  const form = new FormData();
  form.append('file', input.file);
  form.append('docType', input.docType);
  if (input.label) form.append('label', input.label);
  if (input.documentNumber) form.append('documentNumber', input.documentNumber);
  if (input.issueDate) form.append('issueDate', input.issueDate);
  if (input.expiryDate) form.append('expiryDate', input.expiryDate);
  const res = await api.post(`/e/employee/${employeeId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
};

export const updateEmployeeDocument = async (
  employeeId: string,
  docId: string,
  patch: Partial<Omit<NewEmployeeDocumentInput, 'file'>>,
): Promise<EmployeeDocument> => {
  const res = await api.patch(`/e/employee/${employeeId}/documents/${docId}`, patch);
  return res.data.data;
};

export const deleteEmployeeDocument = async (employeeId: string, docId: string): Promise<void> => {
  await api.delete(`/e/employee/${employeeId}/documents/${docId}`);
};

/** null = no expiry, 'expired', 'soon' (<= 30 days), 'ok'. */
export const documentExpiryStatus = (expiry: string | null): null | 'expired' | 'soon' | 'ok' => {
  if (!expiry) return null;
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
};
