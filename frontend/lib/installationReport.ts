import api from './api';
import type { InstallationRequest } from './saleWorkflow';

/**
 * The installation report — the handover document for a completed installation, plus
 * the customer's signature on it.
 *
 * The report is never stored: the server assembles it live from the request, its
 * contract and the machines allocated to it, so it cannot drift from those records.
 * Only the signature is persisted.
 */

export interface InstallationReportMachine {
  allocationId: string;
  serialNumber: string;
  productId?: string | null;
  modelId?: string | null;
  productName?: string | null;
  brand?: string | null;
  modelName?: string | null;
  imageUrl?: string | null;
  allocatedAt?: string | null;
  allocationStatus?: string;
  initialReading: { bwA4: number; bwA3: number; colorA4: number; colorA3: number };
}

export interface InstallationReportContract {
  id: string;
  invoiceNumber: string;
  saleType?: string;
  rentPeriod?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  customerId?: string;
  customerName?: string;
  contractStatus?: string;
}

export interface InstallationReportSignature {
  signed: boolean;
  signedAt?: string | null;
  name?: string | null;
  /** base64 PNG data URI. */
  data?: string | null;
  note?: string | null;
  method?: 'IN_PERSON' | 'REMOTE_LINK' | null;
}

export interface InstallationReportDetail {
  request: InstallationRequest & {
    reportGeneratedAt?: string;
    customerSignedAt?: string;
    customerSignatureName?: string;
    customerSignatureData?: string;
    customerSignatureNote?: string;
    customerSignatureMethod?: string;
  };
  contract: InstallationReportContract | null;
  /** Contact details from CRM, when the customer record could be reached. */
  customer: { phone?: string | null; email?: string | null; city?: string | null } | null;
  /** Where the machine sits — request address, else the customer's address on file. */
  siteAddress: string | null;
  machines: InstallationReportMachine[];
  /** Contract-level reading, present only when no allocation row carries one. */
  fallbackReading: { bwA4: number; bwA3: number; colorA4: number; colorA3: number } | null;
  signature: InstallationReportSignature;
}

interface Res<T> {
  success: boolean;
  data: T;
}

export const getInstallationReport = (requestId: string) =>
  api
    .get<Res<InstallationReportDetail>>(`/b/installation-requests/${requestId}/report`)
    .then((r) => r.data.data);

export const generateInstallationSigningToken = (requestId: string) =>
  api
    .post<
      Res<{ token: string; expiresAt: string }>
    >(`/b/installation-requests/${requestId}/signing-token`)
    .then((r) => r.data.data);

export const signInstallationReportInPerson = (
  requestId: string,
  payload: { signatureName: string; signatureData: string; note?: string },
) =>
  api
    .post<Res<InstallationRequest>>(`/b/installation-requests/${requestId}/sign`, payload)
    .then((r) => r.data.data);

// ─── Public (token-authenticated) ────────────────────────────────────────────

export const getInstallationReportForSigning = (token: string) =>
  api.get<Res<InstallationReportDetail>>(`/b/installation/sign/${token}`).then((r) => r.data.data);

export const signInstallationReportViaToken = (
  token: string,
  payload: { signatureName: string; signatureData: string; note?: string },
) =>
  api
    .post<Res<{ signedAt: string }>>(`/b/installation/sign/${token}`, payload)
    .then((r) => r.data.data);

// ─── Display helpers ─────────────────────────────────────────────────────────

export function formatReportDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatReportDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
