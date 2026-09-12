/**
 * The kinds of legal / HR documents we store against an employee. OTHER is the
 * catch-all so the list never blocks an upload — the free-text `label` on the
 * document carries the specifics.
 */
export enum EmployeeDocumentType {
  PASSPORT = 'PASSPORT',
  EMIRATES_ID = 'EMIRATES_ID',
  QATAR_ID = 'QATAR_ID',
  NATIONAL_ID = 'NATIONAL_ID',
  VISA = 'VISA',
  RESIDENCE_PERMIT = 'RESIDENCE_PERMIT',
  LABOUR_CONTRACT = 'LABOUR_CONTRACT',
  WORK_PERMIT = 'WORK_PERMIT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  HEALTH_CARD = 'HEALTH_CARD',
  INSURANCE = 'INSURANCE',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER',
}

export const EMPLOYEE_DOCUMENT_TYPES = Object.values(EmployeeDocumentType);
