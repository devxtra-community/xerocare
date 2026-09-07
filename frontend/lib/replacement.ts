import api from './api';

/**
 * Machine Replacement chain — client for the seven-stage flow that moves a machine off
 * a Rent/Lease contract and a new one on.
 *
 * Every call maps to one stage transition on the server; nothing here computes state.
 * The allocation swap itself happens server-side at `installReplacement` only — see
 * ReplacementStatus.INSTALLED in the backend entity for why that stage and no other.
 */

export type ReplacementStatus =
  | 'PENDING_FINANCE'
  | 'APPROVED'
  | 'REJECTED'
  | 'UNIT_SELECTED'
  | 'DELIVERED'
  | 'TECHNICIAN_ASSIGNED'
  | 'INSTALLED'
  | 'CUSTOMER_APPROVED'
  | 'CANCELLED';

/** Stages where a replacement is still moving — one per contract at a time. */
export const OPEN_REPLACEMENT_STATUSES: ReplacementStatus[] = [
  'PENDING_FINANCE',
  'APPROVED',
  'UNIT_SELECTED',
  'DELIVERED',
  'TECHNICIAN_ASSIGNED',
];

export interface ReplacementRequest {
  id: string;
  requestNo: string;
  contractId: string;
  contractNumber: string;
  branchId: string;
  oldAllocationId: string;
  oldSerialNumber: string;
  oldProductId?: string;
  modelId?: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  reason: string;
  notes?: string;
  proofPhotoUrls: string[];
  raisedByEmployeeId: string;
  raisedByEmployeeName: string;
  raisedAt: string;
  status: ReplacementStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  newProductId?: string;
  newSerialNumber?: string;
  selectedAt?: string;
  selectedByName?: string;
  deliveredAt?: string;
  deliveredByName?: string;
  technicianId?: string;
  technicianName?: string;
  assignedAt?: string;
  oldMeterBwA4?: number;
  oldMeterBwA3?: number;
  oldMeterColorA4?: number;
  oldMeterColorA3?: number;
  newMeterBwA4?: number;
  newMeterBwA3?: number;
  newMeterColorA4?: number;
  newMeterColorA3?: number;
  installedOn?: string;
  installedAt?: string;
  /** On-site clock: starts when the technician begins removing the old machine, stops
   *  when the install is submitted. Null on jobs raised before the timer existed. */
  workStartedAt?: string;
  workEndedAt?: string;
  workDurationSeconds?: number;
  installPhotoUrls: string[];
  /** Finance audit of the machine that came off the contract. PENDING until someone
   *  inspects it — a swapped-out unit is never sellable stock automatically. */
  dispositionStatus?: 'PENDING' | 'MOVED_TO_STOCK' | 'MOVED_TO_GWR';
  dispositionNote?: string;
  dispositionAt?: string;
  dispositionByName?: string;
  newAllocationId?: string;
  reportSentAt?: string;
  reportChannel?: string;
  customerApprovedAt?: string;
  customerApprovalName?: string;
  approvalNote?: string;
  createdAt: string;
}

export interface ReplacementProduct {
  id?: string;
  name?: string;
  serial_no?: string;
  brand?: string;
  image_url?: string;
  model_name?: string;
  description?: string;
}

export interface ReplacementContract {
  id: string;
  invoiceNumber: string;
  saleType: string;
  rentPeriod?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  customerId?: string;
  customerName?: string;
  contractStatus?: string;
}

export interface ReplacementMachine {
  allocationId: string;
  serialNumber: string;
  productId?: string;
  modelId?: string;
  currentBwA4: number;
  currentBwA3: number;
  currentColorA4: number;
  currentColorA3: number;
  startTimestamp: string;
  product: ReplacementProduct | null;
}

/** Everything the request form needs, in one call. */
export interface ReplacementContext {
  contract: ReplacementContract;
  machines: ReplacementMachine[];
  latestRequest: ReplacementRequest | null;
}

/** Everything the detail dialogs and the report need, in one call. */
export interface ReplacementDetail {
  request: ReplacementRequest;
  contract: ReplacementContract | null;
  oldAllocation: {
    id: string;
    serialNumber: string;
    initialBwA4: number;
    initialBwA3: number;
    initialColorA4: number;
    initialColorA3: number;
    currentBwA4: number;
    currentBwA3: number;
    currentColorA4: number;
    currentColorA3: number;
    startTimestamp: string;
    endTimestamp?: string;
    status: string;
  } | null;
  newAllocation: ReplacementDetail['oldAllocation'];
  oldProduct: ReplacementProduct | null;
  newProduct: ReplacementProduct | null;
  installation: {
    installedOn: string | null;
    technicianName?: string;
    completedAt?: string;
  } | null;
}

export interface MeterReading {
  bwA4: number;
  bwA3: number;
  colorA4: number;
  colorA3: number;
  source?: 'LAST_BILLED' | 'ALLOCATION';
}

const BASE = '/b/replacements';

export const getReplacementContext = (contractId: string) =>
  api
    .get<{ data: ReplacementContext }>(`${BASE}/contract/${contractId}/context`)
    .then((r) => r.data.data);

export const listReplacements = (params?: {
  status?: string;
  contractId?: string;
  mine?: boolean;
}) =>
  api
    .get<{ data: ReplacementRequest[] }>(BASE, {
      params: { ...params, mine: params?.mine ? 'true' : undefined },
    })
    .then((r) => r.data.data);

export const getReplacement = (id: string) =>
  api.get<{ data: ReplacementDetail }>(`${BASE}/${id}`).then((r) => r.data.data);

/** The outgoing machine's last billed reading — the floor for the closing meter. */
export const getReplacementLastReading = (id: string) =>
  api.get<{ data: MeterReading }>(`${BASE}/${id}/last-reading`).then((r) => r.data.data);

/** Stage 01 — multipart, because the fault photos are part of the request. */
export const createReplacementRequest = (payload: {
  contractId: string;
  allocationId: string;
  reason: string;
  notes: string;
  photos: File[];
}) => {
  const form = new FormData();
  form.append('contractId', payload.contractId);
  form.append('allocationId', payload.allocationId);
  form.append('reason', payload.reason);
  form.append('notes', payload.notes);
  payload.photos.forEach((f) => form.append('photos', f));
  return api
    .post<{ data: ReplacementRequest }>(BASE, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.data);
};

/** Stage 02 — Finance accepts or declines. */
export const decideReplacement = (
  id: string,
  decision: 'APPROVE' | 'REJECT',
  rejectionReason?: string,
) =>
  api
    .post<{ data: ReplacementRequest }>(`${BASE}/${id}/decision`, { decision, rejectionReason })
    .then((r) => r.data.data);

/** Stage 03 — records which unit was chosen. Swaps nothing. */
export const selectReplacementUnit = (id: string, newProductId: string, newSerialNumber: string) =>
  api
    .post<{ data: ReplacementRequest }>(`${BASE}/${id}/select-unit`, {
      newProductId,
      newSerialNumber,
    })
    .then((r) => r.data.data);

/** Stage 04 — service desk confirms the unit reached the customer. */
export const setReplacementDelivery = (id: string, delivered: boolean) =>
  api
    .post<{ data: ReplacementRequest }>(`${BASE}/${id}/delivery`, { delivered })
    .then((r) => r.data.data);

/** Stage 05 — service desk assigns the technician. */
export const assignReplacementTechnician = (
  id: string,
  technicianId: string,
  technicianName?: string,
) =>
  api
    .post<{ data: ReplacementRequest }>(`${BASE}/${id}/assign-technician`, {
      technicianId,
      technicianName,
    })
    .then((r) => r.data.data);

/**
 * Stage 06 — the swap. Both meters are read on site and the allocation boundary is set
 * from them, so this is the only call that changes what machine the contract bills on.
 */
/** Stage 08 — Finance audits the returned machine and says where it goes.
 *  STOCK → product becomes AVAILABLE.  GWR → goods-warehouse-return, becomes DAMAGED. */
export const dispositionReplacement = (
  id: string,
  payload: { action: 'STOCK' | 'GWR'; note?: string },
) =>
  api
    .post<{ data: ReplacementRequest }>(`/b/replacements/${id}/disposition`, payload)
    .then((r) => r.data.data);

/** Stage 06a — technician taps Start on site. Idempotent server-side. */
export const startReplacementWork = (id: string) =>
  api
    .post<{ data: ReplacementRequest }>(`/b/replacements/${id}/start-work`)
    .then((r) => r.data.data);

/** Minutes and seconds for an on-site job; hours only once it runs that long. */
export function formatWorkDuration(seconds?: number | null): string {
  if (seconds == null) return '—';
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export const installReplacement = (
  id: string,
  payload: {
    oldMeter: MeterReading;
    newMeter: MeterReading;
    installedOn: string;
    photos: File[];
  },
) => {
  const form = new FormData();
  form.append('oldBwA4', String(payload.oldMeter.bwA4));
  form.append('oldBwA3', String(payload.oldMeter.bwA3));
  form.append('oldColorA4', String(payload.oldMeter.colorA4));
  form.append('oldColorA3', String(payload.oldMeter.colorA3));
  form.append('newBwA4', String(payload.newMeter.bwA4));
  form.append('newBwA3', String(payload.newMeter.bwA3));
  form.append('newColorA4', String(payload.newMeter.colorA4));
  form.append('newColorA3', String(payload.newMeter.colorA3));
  form.append('installedOn', payload.installedOn);
  payload.photos.forEach((f) => form.append('photos', f));
  return api
    .post<{ data: ReplacementRequest }>(`${BASE}/${id}/install`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.data);
};

/** Stage 07 — 72-hour single-use customer signing link. */
export const generateReplacementSigningToken = (id: string) =>
  api
    .post<{ data: { token: string; expiresAt: string } }>(`${BASE}/${id}/signing-token`)
    .then((r) => r.data.data);

export const sendReplacementReport = (
  id: string,
  channel: 'email' | 'whatsapp',
  recipient?: string,
) =>
  api
    .post<{
      data: { message: string; recipient: string; link: string };
    }>(`${BASE}/${id}/notify/${channel}`, recipient ? { recipient } : {})
    .then((r) => r.data.data);

/** In-person sign-off, when the customer approves in front of the technician. */
export const markReplacementCustomerApproved = (
  id: string,
  customerName: string,
  approvalNote?: string,
) =>
  api
    .post<{ data: ReplacementRequest }>(`${BASE}/${id}/mark-approved`, {
      customerName,
      approvalNote,
    })
    .then((r) => r.data.data);

// ─── Public (unauthenticated) signing page ───────────────────────────────────
export const getReplacementForSigning = (token: string) =>
  api.get<{ data: ReplacementDetail }>(`/b/replacement/sign/${token}`).then((r) => r.data.data);

export const approveReplacementViaToken = (
  token: string,
  customerName: string,
  approvalNote?: string,
) =>
  api
    .post<{ data: { status: ReplacementStatus } }>(`/b/replacement/sign/${token}/approve`, {
      customerName,
      approvalNote,
    })
    .then((r) => r.data.data);

// ─── Display helpers ─────────────────────────────────────────────────────────

export const REPLACEMENT_REASONS = [
  'Breakdown',
  'Persistent Fault',
  'Customer Request',
  'Upgrade',
  'Other',
] as const;

export const REPLACEMENT_STATUS_LABEL: Record<ReplacementStatus, string> = {
  PENDING_FINANCE: 'Awaiting Finance',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  UNIT_SELECTED: 'Unit Selected',
  DELIVERED: 'Delivered',
  TECHNICIAN_ASSIGNED: 'Technician Assigned',
  INSTALLED: 'Installed',
  CUSTOMER_APPROVED: 'Customer Approved',
  CANCELLED: 'Cancelled',
};

export const REPLACEMENT_STATUS_CLASS: Record<ReplacementStatus, string> = {
  PENDING_FINANCE: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  UNIT_SELECTED: 'bg-blue-50 text-blue-700 border-blue-200',
  DELIVERED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  TECHNICIAN_ASSIGNED: 'bg-violet-50 text-violet-700 border-violet-200',
  INSTALLED: 'bg-teal-50 text-teal-700 border-teal-200',
  CUSTOMER_APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};
