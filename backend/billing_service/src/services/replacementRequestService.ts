import { randomBytes } from 'crypto';
import { sign as jwtSign } from 'jsonwebtoken';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { Invoice } from '../entities/invoiceEntity';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { UsageRecordItem } from '../entities/usageRecordItemEntity';
import { InstallationRequest } from '../entities/installationRequestEntity';
import { ReplacementRequest, ReplacementStatus } from '../entities/replacementRequestEntity';
import { logAudit } from './auditLogService';
import { r2SignedGetUrl } from '../utils/r2Url';
import { emitProductStatusUpdate } from '../events/publisher/productStatusEvent';
import { logger } from '../config/logger';

/**
 * Machine Replacement chain — the workflow around a machine swap.
 *
 * The swap ITSELF is billingService.replaceDeviceAllocation(), which already closes the
 * outgoing allocation at its final meter and opens the incoming one at its initial
 * meter, writing a DeviceMeterReading for each. That primitive is what makes a
 * mid-period bill come out right (usageService settles every allocation that overlaps
 * the period separately), and this service does not reimplement any of it.
 *
 * What this service adds is *when* that call is allowed to happen, and who signed off on
 * each step along the way.
 */

/** Only these two ever move a machine, and only these two can be replaced. */
const REPLACEABLE_SALE_TYPES = ['RENT', 'LEASE'];

/** Stages after which the contract already has an in-flight replacement. */
const OPEN_STATUSES: string[] = [
  ReplacementStatus.PENDING_FINANCE,
  ReplacementStatus.APPROVED,
  ReplacementStatus.UNIT_SELECTED,
  ReplacementStatus.DELIVERED,
  ReplacementStatus.TECHNICIAN_ASSIGNED,
];

async function generateRequestNo(): Promise<string> {
  const repo = Source.getRepository(ReplacementRequest);
  const year = new Date().getFullYear();
  const count = await repo
    .createQueryBuilder('r')
    .where(`EXTRACT(YEAR FROM r."createdAt") = :year`, { year })
    .getCount();
  return `RPL-${year}-${String(count + 1).padStart(4, '0')}`;
}

function makeServiceToken(): string {
  return jwtSign(
    { userId: 'billing_service', role: 'ADMIN' },
    process.env.ACCESS_SECRET as string,
    { expiresIn: '2m' },
  );
}

async function fetchEmployeeName(employeeId?: string): Promise<string> {
  if (!employeeId) return 'Employee';
  try {
    const empUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const res = await fetch(`${empUrl}/employee/${employeeId}`, {
      headers: { Authorization: `Bearer ${makeServiceToken()}`, 'x-internal-service': 'billing' },
    });
    if (!res.ok) return 'Employee';
    const data = await res.json();
    const emp = data.data ?? data;
    const name =
      `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim();
    return name || emp.email || 'Employee';
  } catch {
    return 'Employee';
  }
}

async function fetchCustomerContact(
  customerId?: string | null,
): Promise<{ email?: string; phone?: string; name?: string } | null> {
  if (!customerId) return null;
  try {
    const crmUrl = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
    const res = await fetch(`${crmUrl}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${makeServiceToken()}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const c = body.data ?? body;
    return {
      email: c.email,
      phone: c.phone || c.phoneNumber || c.mobileNumber,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name,
    };
  } catch {
    return null;
  }
}

/** Product details (name, image, model) straight from ven_inv, for the form and report. */
export async function fetchProductDetail(productId?: string | null): Promise<{
  id?: string;
  name?: string;
  serial_no?: string;
  brand?: string;
  image_url?: string;
  model_name?: string;
  description?: string;
} | null> {
  if (!productId) return null;
  try {
    const invUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
    const res = await fetch(`${invUrl}/products/${productId}`, {
      headers: { Authorization: `Bearer ${makeServiceToken()}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const p = body.data ?? body;
    return {
      id: p.id,
      name: p.name,
      serial_no: p.serial_no,
      brand: p.brand,
      image_url: p.image_url ?? p.imageUrl ?? p.product_image,
      model_name: p.model?.model_name ?? p.model_name,
      description: p.description,
    };
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Stage 01 · employee raises the request
// ────────────────────────────────────────────────────────────────────────────

export interface RaiseReplacementParams {
  contractId: string;
  allocationId: string;
  reason: string;
  notes?: string;
  proofPhotoUrls?: string[];
  branchId: string;
  userId: string;
}

export async function raiseReplacementRequest(
  params: RaiseReplacementParams,
): Promise<ReplacementRequest> {
  const { contractId, allocationId, reason, notes, proofPhotoUrls = [], branchId, userId } = params;

  if (!reason?.trim()) throw new AppError('A replacement reason is required', 400);
  if (!notes?.trim()) throw new AppError('Notes describing the fault are required', 400);
  if (proofPhotoUrls.length === 0) {
    throw new AppError('At least one proof photo is required', 400);
  }

  const invoice = await Source.getRepository(Invoice).findOne({ where: { id: contractId } });
  if (!invoice) throw new AppError('Contract not found', 404);
  if (!REPLACEABLE_SALE_TYPES.includes(String(invoice.saleType))) {
    throw new AppError('Only Rent and Lease contracts can have a machine replaced', 400);
  }
  if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);

  const allocation = await Source.getRepository(ProductAllocation).findOne({
    where: { id: allocationId, contractId },
  });
  if (!allocation) throw new AppError('Machine allocation not found on this contract', 404);
  if (allocation.status !== AllocationStatus.ALLOCATED) {
    throw new AppError('That machine is not currently allocated to this contract', 400);
  }
  // Accessories are never metered and are never "replaced" through this chain — they'd
  // have no meter readings to carry across the swap.
  if (allocation.itemType === 'ACCESSORY') {
    throw new AppError('Accessories cannot be replaced through this workflow', 400);
  }

  const existing = await Source.getRepository(ReplacementRequest).findOne({
    where: { contractId, status: OPEN_STATUSES as never },
  });
  if (existing) {
    throw new AppError(
      `This contract already has a replacement in progress (${existing.requestNo})`,
      400,
    );
  }

  const [requestNo, raisedByEmployeeName, contact] = await Promise.all([
    generateRequestNo(),
    fetchEmployeeName(userId),
    fetchCustomerContact(invoice.customerId),
  ]);

  const repo = Source.getRepository(ReplacementRequest);
  const request = repo.create({
    requestNo,
    contractId,
    contractNumber: invoice.invoiceNumber,
    branchId,
    oldAllocationId: allocation.id,
    oldSerialNumber: allocation.serialNumber,
    oldProductId: allocation.productId,
    modelId: allocation.modelId,
    customerId: invoice.customerId,
    customerName: invoice.customerName || contact?.name || 'Customer',
    customerEmail: contact?.email ?? undefined,
    customerPhone: contact?.phone ?? undefined,
    reason: reason.trim(),
    notes: notes.trim(),
    proofPhotoUrls,
    raisedByEmployeeId: userId,
    raisedByEmployeeName,
    raisedAt: new Date(),
    status: ReplacementStatus.PENDING_FINANCE,
  });

  const saved = await repo.save(request);
  await logAudit(
    contractId,
    'REPLACEMENT_REQUESTED',
    userId,
    `Replacement ${saved.requestNo} raised for ${allocation.serialNumber} — ${reason}`,
  );
  return saved;
}

// ────────────────────────────────────────────────────────────────────────────
// Stage 02 · finance decision
// ────────────────────────────────────────────────────────────────────────────

export async function decideReplacementRequest(
  id: string,
  userId: string,
  decision: 'APPROVE' | 'REJECT',
  rejectionReason?: string,
): Promise<ReplacementRequest> {
  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);
  if (request.status !== ReplacementStatus.PENDING_FINANCE) {
    throw new AppError(`This request is already ${request.status}`, 400);
  }
  if (decision === 'REJECT' && !rejectionReason?.trim()) {
    throw new AppError('A reason is required when rejecting a replacement request', 400);
  }

  request.status = decision === 'APPROVE' ? ReplacementStatus.APPROVED : ReplacementStatus.REJECTED;
  request.reviewedById = userId;
  request.reviewedByName = await fetchEmployeeName(userId);
  request.reviewedAt = new Date();
  if (decision === 'REJECT') request.rejectionReason = rejectionReason!.trim();

  const saved = await repo.save(request);
  await logAudit(
    request.contractId,
    decision === 'APPROVE' ? 'REPLACEMENT_APPROVED' : 'REPLACEMENT_REJECTED',
    userId,
    `Replacement ${request.requestNo} ${decision === 'APPROVE' ? 'approved' : `rejected — ${rejectionReason}`}`,
  );
  return saved;
}

// ────────────────────────────────────────────────────────────────────────────
// Stage 03 · employee selects the incoming unit  (NO swap happens here)
// ────────────────────────────────────────────────────────────────────────────

export async function selectReplacementUnit(
  id: string,
  userId: string,
  newProductId: string,
  newSerialNumber: string,
): Promise<ReplacementRequest> {
  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);
  if (request.status !== ReplacementStatus.APPROVED) {
    throw new AppError('Finance must approve this request before a unit can be chosen', 400);
  }
  if (!newProductId || !newSerialNumber) {
    throw new AppError('Select the replacement machine before continuing', 400);
  }
  if (newProductId === request.oldProductId) {
    throw new AppError('The replacement must be a different machine', 400);
  }

  request.newProductId = newProductId;
  request.newSerialNumber = newSerialNumber;
  request.selectedAt = new Date();
  request.selectedById = userId;
  request.selectedByName = await fetchEmployeeName(userId);
  request.status = ReplacementStatus.UNIT_SELECTED;

  const saved = await repo.save(request);
  await logAudit(
    request.contractId,
    'REPLACEMENT_UNIT_SELECTED',
    userId,
    `Replacement ${request.requestNo}: ${request.oldSerialNumber} → ${newSerialNumber} selected`,
  );
  return saved;
}

// ────────────────────────────────────────────────────────────────────────────
// Stage 04/05 · service desk delivery + technician assignment
// ────────────────────────────────────────────────────────────────────────────

export async function markReplacementDelivered(
  id: string,
  userId: string,
  delivered: boolean,
): Promise<ReplacementRequest> {
  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);
  if (
    request.status !== ReplacementStatus.UNIT_SELECTED &&
    request.status !== ReplacementStatus.DELIVERED
  ) {
    throw new AppError('Only a selected replacement can be marked delivered', 400);
  }

  if (delivered) {
    request.deliveredAt = new Date();
    request.deliveredById = userId;
    request.deliveredByName = await fetchEmployeeName(userId);
    request.status = ReplacementStatus.DELIVERED;
  } else {
    // Undo: back to selected, and drop any technician already assigned against it.
    request.deliveredAt = undefined;
    request.deliveredById = undefined;
    request.deliveredByName = undefined;
    request.technicianId = undefined;
    request.technicianName = undefined;
    request.assignedAt = undefined;
    request.status = ReplacementStatus.UNIT_SELECTED;
  }

  return repo.save(request);
}

export async function assignReplacementTechnician(
  id: string,
  userId: string,
  technicianId: string,
  technicianName?: string,
): Promise<ReplacementRequest> {
  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);
  if (
    request.status !== ReplacementStatus.DELIVERED &&
    request.status !== ReplacementStatus.TECHNICIAN_ASSIGNED
  ) {
    throw new AppError('Mark the machine delivered before assigning a technician', 400);
  }
  if (!technicianId) throw new AppError('technicianId is required', 400);

  request.technicianId = technicianId;
  request.technicianName = technicianName || (await fetchEmployeeName(technicianId));
  request.assignedAt = new Date();
  request.status = ReplacementStatus.TECHNICIAN_ASSIGNED;

  const saved = await repo.save(request);
  await logAudit(
    request.contractId,
    'REPLACEMENT_TECHNICIAN_ASSIGNED',
    userId,
    `Replacement ${request.requestNo} assigned to ${saved.technicianName}`,
  );
  return saved;
}

// ────────────────────────────────────────────────────────────────────────────
// Stage 06 · technician install — THE swap
// ────────────────────────────────────────────────────────────────────────────

/**
 * Stage 08 — Finance audits the machine that came off the contract and says where it goes.
 *
 * A swapped-out unit is NOT sellable stock the moment the technician finishes: it comes
 * back in unknown condition, which is the whole reason the customer wanted it replaced.
 * The swap leaves it RETURNED (off-contract, awaiting audit) and it stays there until
 * someone in Finance has looked at the evidence and made a call:
 *
 *   MOVED_TO_STOCK → the unit is fine; product becomes AVAILABLE and can be sold or
 *                    allocated again.
 *   MOVED_TO_GWR   → goods-warehouse-return; product becomes DAMAGED and is out of
 *                    sellable stock for good.
 *
 * One-way: a disposition is an inspection outcome, not a toggle.
 */
export async function dispositionReplacementMachine(params: {
  id: string;
  action: 'STOCK' | 'GWR';
  note?: string;
  userId: string;
}): Promise<ReplacementRequest> {
  const { id, action, note, userId } = params;
  const userName = await fetchEmployeeName(userId);
  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);

  // Only a swap that actually happened has a machine to dispose of.
  if (
    request.status !== ReplacementStatus.INSTALLED &&
    request.status !== ReplacementStatus.CUSTOMER_APPROVED
  ) {
    throw new AppError(
      `The replacement must be installed before the returned machine can be audited — this one is ${request.status}`,
      400,
    );
  }
  if (request.dispositionStatus && request.dispositionStatus !== 'PENDING') {
    throw new AppError(
      `This machine has already been audited (${request.dispositionStatus.replace(/_/g, ' ').toLowerCase()})`,
      400,
    );
  }
  if (!request.oldProductId) {
    throw new AppError('This request has no outgoing machine recorded', 400);
  }

  request.dispositionStatus = action === 'STOCK' ? 'MOVED_TO_STOCK' : 'MOVED_TO_GWR';
  request.dispositionNote = note?.trim() || undefined;
  request.dispositionAt = new Date();
  request.dispositionById = userId;
  request.dispositionByName = userName;
  const saved = await repo.save(request);

  // Inventory owns product status; we publish the outcome and let its worker apply it.
  // Fire-and-forget with a logged failure, matching every other emit on this path — the
  // audit decision is recorded either way and can be re-published if the bus was down.
  emitProductStatusUpdate({
    productId: request.oldProductId,
    billType: action === 'STOCK' ? 'AVAILABLE' : 'DAMAGED',
    invoiceId: request.contractId,
    approvedBy: userId,
    approvedAt: new Date(),
    branchId: request.branchId,
    customerId: null,
  }).catch((err) =>
    logger.error('Failed to emit replacement disposition status', { id, action, err }),
  );

  await logAudit(
    request.contractId,
    action === 'STOCK' ? 'REPLACEMENT_MACHINE_TO_STOCK' : 'REPLACEMENT_MACHINE_TO_GWR',
    userId,
    `${request.requestNo}: returned unit ${request.oldSerialNumber} ${
      action === 'STOCK' ? 'cleared back into stock' : 'sent to goods-warehouse-return as damaged'
    } by ${userName}${note?.trim() ? ` — ${note.trim()}` : ''}`,
  );
  return saved;
}

/**
 * Stage 06a — the technician starts work on site.
 *
 * No new status: the job stays TECHNICIAN_ASSIGNED and the presence of workStartedAt is
 * what tells the UI the clock is running. Idempotent — tapping Start twice keeps the
 * original timestamp rather than quietly restarting the clock and under-reporting the
 * time spent.
 */
export async function startReplacementWork(id: string): Promise<ReplacementRequest> {
  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);
  if (request.status !== ReplacementStatus.TECHNICIAN_ASSIGNED) {
    throw new AppError(
      `Work can only be started on a replacement assigned to a technician — this one is ${request.status}`,
      400,
    );
  }
  if (request.workStartedAt) return request;

  request.workStartedAt = new Date();
  return repo.save(request);
}

export interface InstallReplacementParams {
  id: string;
  userId: string;
  oldMeter: { bwA4?: number; bwA3?: number; colorA4?: number; colorA3?: number };
  newMeter: { bwA4?: number; bwA3?: number; colorA4?: number; colorA3?: number };
  installedOn?: string;
  installPhotoUrls?: string[];
}

/**
 * Records both meters and performs the allocation swap.
 *
 * The status stamp and the swap have to land together — a request marked INSTALLED with
 * no new allocation (or an allocation swapped while the request still says
 * TECHNICIAN_ASSIGNED) would put the next usage bill on the wrong machine. The swap runs
 * first and, if it succeeds, the stamp is written; a failure anywhere throws before the
 * request row is touched.
 */
export async function installReplacement(
  params: InstallReplacementParams,
): Promise<ReplacementRequest> {
  const { id, userId, oldMeter, newMeter, installedOn, installPhotoUrls = [] } = params;

  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);
  if (request.status !== ReplacementStatus.TECHNICIAN_ASSIGNED) {
    throw new AppError(
      `Cannot install a replacement in state ${request.status} — it must be assigned to a technician first`,
      400,
    );
  }
  if (!request.newProductId || !request.newSerialNumber) {
    throw new AppError('This request has no replacement machine selected', 400);
  }
  // The install submit IS the end of the job, so a duration can only be recorded if the
  // clock was started. Required rather than optional: a half-populated timer would make
  // the service desk's "time taken" column meaningless. Mirrors stopInstallation()'s
  // "Installation has not started yet" guard.
  if (!request.workStartedAt) {
    throw new AppError('Start the job before completing it, so the time on site is recorded.', 400);
  }

  const replacementTimestamp = installedOn ? new Date(`${installedOn}T12:00:00`) : new Date();

  // Delegate the physical swap to the one primitive that owns it. It re-validates the
  // outgoing meter against this allocation's own last billed reading and writes both
  // DeviceMeterReading rows — the pair that makes the mid-period bill reconcile.
  const { BillingService } = await import('./billingService');
  const billingService = new BillingService();
  const result = await billingService.replaceDeviceAllocation({
    allocationId: request.oldAllocationId,
    replacementTimestamp: replacementTimestamp.toISOString(),
    oldMeter,
    newProductId: request.newProductId,
    newSerialNumber: request.newSerialNumber,
    newInitialMeter: newMeter,
    reason: request.reason,
  });

  request.oldMeterBwA4 = oldMeter.bwA4 ?? 0;
  request.oldMeterBwA3 = oldMeter.bwA3 ?? 0;
  request.oldMeterColorA4 = oldMeter.colorA4 ?? 0;
  request.oldMeterColorA3 = oldMeter.colorA3 ?? 0;
  request.newMeterBwA4 = newMeter.bwA4 ?? 0;
  request.newMeterBwA3 = newMeter.bwA3 ?? 0;
  request.newMeterColorA4 = newMeter.colorA4 ?? 0;
  request.newMeterColorA3 = newMeter.colorA3 ?? 0;
  request.installedOn = installedOn || replacementTimestamp.toISOString().split('T')[0];
  request.installedAt = new Date();
  request.installedById = userId;
  // Stop the on-site clock. Floored at 0 so a clock skew can never store a negative.
  request.workEndedAt = new Date();
  request.workDurationSeconds = Math.max(
    0,
    Math.floor((request.workEndedAt.getTime() - new Date(request.workStartedAt).getTime()) / 1000),
  );
  request.installPhotoUrls = installPhotoUrls;
  // replaceDeviceAllocation returns the new ProductAllocation itself, not a wrapper.
  request.newAllocationId = (result as { id?: string })?.id ?? undefined;
  request.status = ReplacementStatus.INSTALLED;

  const saved = await repo.save(request);
  await logAudit(
    request.contractId,
    'REPLACEMENT_INSTALLED',
    userId,
    `Replacement ${request.requestNo} installed: ${request.oldSerialNumber} closed at ${request.oldMeterBwA4} B&W, ${request.newSerialNumber} opened at ${request.newMeterBwA4} B&W`,
  );
  logger.info(
    `[Replacement] ${request.requestNo} swap committed — new allocation ${request.newAllocationId}`,
  );
  return saved;
}

// ────────────────────────────────────────────────────────────────────────────
// Stage 07 · report + customer approval
// ────────────────────────────────────────────────────────────────────────────

export async function issueReplacementSigningToken(
  id: string,
): Promise<{ token: string; expiresAt: Date }> {
  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);
  if (request.status !== ReplacementStatus.INSTALLED) {
    throw new AppError('The replacement must be installed before it can be signed off', 400);
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  request.signingToken = token;
  request.signingTokenExpiresAt = expiresAt;
  request.signingTokenUsed = false;
  await repo.save(request);
  return { token, expiresAt };
}

export async function approveReplacementByCustomer(
  id: string,
  approvalName: string,
  approvalNote?: string,
): Promise<ReplacementRequest> {
  const repo = Source.getRepository(ReplacementRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);
  if (request.status === ReplacementStatus.CUSTOMER_APPROVED) return request;
  if (request.status !== ReplacementStatus.INSTALLED) {
    throw new AppError('Only an installed replacement can be approved by the customer', 400);
  }

  request.status = ReplacementStatus.CUSTOMER_APPROVED;
  request.customerApprovedAt = new Date();
  request.customerApprovalName = approvalName || request.customerName;
  request.approvalNote = approvalNote;
  request.signingTokenUsed = true;

  const saved = await repo.save(request);
  await logAudit(
    request.contractId,
    'REPLACEMENT_CUSTOMER_APPROVED',
    request.installedById || 'CUSTOMER',
    `Replacement ${request.requestNo} approved by ${saved.customerApprovalName}`,
  );
  return saved;
}

// ────────────────────────────────────────────────────────────────────────────
// Reads
// ────────────────────────────────────────────────────────────────────────────

export async function listReplacementRequests(filter: {
  branchId?: string;
  statuses?: string[];
  technicianId?: string;
  contractId?: string;
}): Promise<ReplacementRequest[]> {
  const qb = Source.getRepository(ReplacementRequest).createQueryBuilder('r');
  if (filter.branchId) qb.andWhere('r."branchId" = :branchId', { branchId: filter.branchId });
  if (filter.contractId)
    qb.andWhere('r."contractId" = :contractId', { contractId: filter.contractId });
  if (filter.statuses?.length)
    qb.andWhere('r.status IN (:...statuses)', { statuses: filter.statuses });
  if (filter.technicianId)
    qb.andWhere('r."technicianId" = :technicianId', { technicianId: filter.technicianId });
  return qb.orderBy('r."raisedAt"', 'DESC').getMany();
}

/**
 * The request plus everything the form and the report need — contract dates, the
 * installation that first put the machine in, both machines' product records, and the
 * outgoing unit's current meter. Assembled here so the UI never has to fan out across
 * three services itself.
 */
export async function getReplacementRequestDetail(id: string) {
  const request = await Source.getRepository(ReplacementRequest).findOne({ where: { id } });
  if (!request) throw new AppError('Replacement request not found', 404);

  // proofPhotoUrls / installPhotoUrls store bare R2 OBJECT KEYS (see the controller's
  // fileKeys()), not links. Handing those straight to the browser made it request
  // them relative to the app's own origin — /replacements/<key> — which 404s and
  // renders as a broken image. R2 is private, so every stored file has to be signed
  // on the way out, exactly as meter photos, receipts and signed contracts already
  // are. Done here rather than in the controller so both consumers of this detail —
  // the internal dialog and the customer's public signing page — get working images.
  const [proofPhotoUrls, installPhotoUrls] = await Promise.all([
    Promise.all((request.proofPhotoUrls ?? []).map(async (k) => (await r2SignedGetUrl(k)) ?? k)),
    Promise.all((request.installPhotoUrls ?? []).map(async (k) => (await r2SignedGetUrl(k)) ?? k)),
  ]);

  const [invoice, oldAllocation, installation, oldProduct, newProduct] = await Promise.all([
    Source.getRepository(Invoice).findOne({ where: { id: request.contractId } }),
    Source.getRepository(ProductAllocation).findOne({ where: { id: request.oldAllocationId } }),
    Source.getRepository(InstallationRequest).findOne({
      where: { invoiceId: request.contractId },
      order: { createdAt: 'ASC' },
    }),
    fetchProductDetail(request.oldProductId),
    fetchProductDetail(request.newProductId),
  ]);

  const newAllocation = request.newAllocationId
    ? await Source.getRepository(ProductAllocation).findOne({
        where: { id: request.newAllocationId },
      })
    : null;

  return {
    // Photos replaced with viewable links; every other field is the row as stored.
    request: { ...request, proofPhotoUrls, installPhotoUrls },
    contract: invoice
      ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          saleType: invoice.saleType,
          rentPeriod: invoice.rentPeriod,
          effectiveFrom: invoice.effectiveFrom,
          effectiveTo: invoice.effectiveTo,
          customerName: invoice.customerName,
          contractStatus: invoice.contractStatus,
        }
      : null,
    oldAllocation,
    newAllocation,
    oldProduct,
    newProduct,
    installation: installation
      ? {
          installedOn:
            installation.initialReadingTakenDate ||
            (installation.endTime ? String(installation.endTime).split('T')[0] : null),
          technicianName: installation.technicianName,
          completedAt: installation.endTime,
        }
      : null,
  };
}

/**
 * The outgoing machine's last billed reading — the floor the technician's closing meter
 * must clear, and the figure the install form pre-fills from. Per-allocation, never the
 * contract aggregate (see the note in replaceDeviceAllocation).
 */
export async function getAllocationLastReading(allocationId: string) {
  const allocation = await Source.getRepository(ProductAllocation).findOne({
    where: { id: allocationId },
  });
  if (!allocation) throw new AppError('Allocation not found', 404);

  const latest = await Source.getRepository(UsageRecord)
    .createQueryBuilder('ur')
    .where('ur."contractId" = :contractId', { contractId: allocation.contractId })
    .andWhere('ur."billType" = \'USAGE\'')
    .orderBy('ur."billingPeriodEnd"', 'DESC')
    .getOne();

  if (latest) {
    const item = await Source.getRepository(UsageRecordItem).findOne({
      where: { usageRecordId: latest.id, allocationId },
    });
    if (item) {
      return {
        bwA4: item.endBwA4 || 0,
        bwA3: item.endBwA3 || 0,
        colorA4: item.endColorA4 || 0,
        colorA3: item.endColorA3 || 0,
        source: 'LAST_BILLED' as const,
      };
    }
  }
  return {
    bwA4: allocation.currentBwA4 || 0,
    bwA3: allocation.currentBwA3 || 0,
    colorA4: allocation.currentColorA4 || 0,
    colorA3: allocation.currentColorA3 || 0,
    source: 'ALLOCATION' as const,
  };
}
