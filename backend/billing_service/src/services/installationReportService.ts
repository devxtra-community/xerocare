import { randomBytes } from 'crypto';
import { sign as jwtSign } from 'jsonwebtoken';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { InstallationRequest } from '../entities/installationRequestEntity';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { fetchProductDetail } from './replacementRequestService';

/**
 * The installation report — the document the technician hands the customer at the end of
 * an installation, and the customer's signature on it.
 *
 * Nothing about the report's *content* is stored: it is assembled live from the request,
 * its contract and the machines allocated to that contract, so it can never drift from
 * the records it describes. Only the handover facts (who signed, when, and the signature
 * image) are persisted on the InstallationRequest row.
 */

function makeServiceToken(): string {
  return jwtSign(
    { userId: 'billing_service', role: 'ADMIN' },
    process.env.ACCESS_SECRET as string,
    {
      expiresIn: '2m',
    },
  );
}

/**
 * Where the machine actually sits.
 *
 * InstallationRequest.customerAddress is only populated when whoever raised the request
 * typed one in, and in practice it is almost always null — so the report falls back to
 * the customer's own address on file in CRM rather than printing a blank "Location".
 */
async function fetchCustomerLocation(customerId?: string | null): Promise<{
  address?: string | null;
  location?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
} | null> {
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
      address: c.address ?? null,
      location: c.location ?? null,
      city: c.city ?? null,
      phone: c.phone ?? c.phoneNumber ?? c.mobileNumber ?? null,
      email: c.email ?? null,
    };
  } catch {
    // The report is still worth producing without it — never fail the whole document
    // because CRM is briefly unreachable.
    return null;
  }
}

export interface InstallationReportMachine {
  allocationId: string;
  serialNumber: string;
  productId?: string | null;
  modelId?: string | null;
  productName?: string | null;
  brand?: string | null;
  modelName?: string | null;
  imageUrl?: string | null;
  allocatedAt?: Date | null;
  /** ALLOCATED | RETURNED | REPLACED — a report may describe a since-swapped unit. */
  allocationStatus?: string;
  /** Meter at handover — the billing floor for this machine. */
  initialReading: { bwA4: number; bwA3: number; colorA4: number; colorA3: number };
}

/** Contract-level initial reading, used when a contract has no allocation rows yet. */
async function readingFromInvoiceItems(invoiceId: string) {
  const items = await Source.getRepository(InvoiceItem).find({
    where: { invoice: { id: invoiceId } },
  });
  const withReading = items.find(
    (i) =>
      i.initialBwCount != null ||
      i.initialBwA3Count != null ||
      i.initialColorCount != null ||
      i.initialColorA3Count != null,
  );
  if (!withReading) return null;
  return {
    bwA4: Number(withReading.initialBwCount ?? 0),
    bwA3: Number(withReading.initialBwA3Count ?? 0),
    colorA4: Number(withReading.initialColorCount ?? 0),
    colorA3: Number(withReading.initialColorA3Count ?? 0),
  };
}

export async function getInstallationReportDetail(id: string) {
  const repo = Source.getRepository(InstallationRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Installation request not found', 404);

  const invoice = await Source.getRepository(Invoice).findOne({
    where: { id: request.invoiceId },
  });

  const customer = await fetchCustomerLocation(invoice?.customerId);
  // Prefer whatever the request captured at raise time (it is the site actually
  // visited), then the customer's address, then their broader location/city.
  const siteAddress =
    request.customerAddress?.trim() ||
    customer?.address?.trim() ||
    [customer?.location, customer?.city].filter(Boolean).join(', ') ||
    null;

  // Every machine put in under this contract, not just the first — a single
  // installation visit can cover several units.
  //
  // Deliberately NOT filtered to status = ALLOCATED. This report is a historical
  // record of one visit: once a machine is later swapped out its allocation becomes
  // REPLACED/RETURNED, and filtering on ALLOCATED would quietly empty the report of
  // the very machine it describes. Instead, take the allocations that were live
  // during the installation window.
  const allAllocations = await Source.getRepository(ProductAllocation).find({
    where: { contractId: request.invoiceId },
    order: { startTimestamp: 'ASC' },
  });

  const visitEnd = request.endTime ? new Date(request.endTime) : null;
  const visitStart = request.startTime ? new Date(request.startTime) : null;
  const duringVisit = allAllocations.filter((a) => {
    if (!visitEnd || !visitStart) return a.status === AllocationStatus.ALLOCATED;
    const from = a.startTimestamp ? new Date(a.startTimestamp) : null;
    const to = a.endTimestamp ? new Date(a.endTimestamp) : null;
    // Allocated on or before the visit finished, and not already ended before it began.
    return (!from || from <= visitEnd) && (!to || to >= visitStart);
  });

  // An allocation created after the visit (Finance allocating late) would otherwise
  // leave the report blank, so fall back to whatever is on the contract now.
  const allocations = duringVisit.length
    ? duringVisit
    : allAllocations.filter((a) => a.status === AllocationStatus.ALLOCATED);

  const machines: InstallationReportMachine[] = await Promise.all(
    allocations.map(async (a) => {
      const product = await fetchProductDetail(a.productId);
      return {
        allocationId: a.id,
        serialNumber: a.serialNumber,
        productId: a.productId ?? null,
        modelId: a.modelId ?? null,
        productName: product?.name ?? null,
        brand: product?.brand ?? null,
        modelName: product?.model_name ?? null,
        imageUrl: product?.image_url ?? null,
        allocatedAt: a.startTimestamp ?? null,
        allocationStatus: a.status,
        initialReading: {
          bwA4: Number(a.initialBwA4 ?? 0),
          bwA3: Number(a.initialBwA3 ?? 0),
          colorA4: Number(a.initialColorA4 ?? 0),
          colorA3: Number(a.initialColorA3 ?? 0),
        },
      };
    }),
  );

  // Fall back to the InvoiceItem copy of the reading when no allocation exists — a SALE
  // install never allocates a metered unit, and a Rent/Lease one occasionally reaches
  // the report before the allocation row is written.
  const fallbackReading =
    machines.length === 0 ? await readingFromInvoiceItems(request.invoiceId) : null;

  return {
    request,
    customer: customer
      ? { phone: customer.phone, email: customer.email, city: customer.city }
      : null,
    siteAddress,
    contract: invoice
      ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          saleType: invoice.saleType,
          rentPeriod: invoice.rentPeriod,
          effectiveFrom: invoice.effectiveFrom,
          effectiveTo: invoice.effectiveTo,
          customerId: invoice.customerId,
          customerName: invoice.customerName ?? request.customerName,
          contractStatus: invoice.contractStatus,
        }
      : null,
    machines,
    fallbackReading,
    signature: {
      signed: Boolean(request.customerSignedAt),
      signedAt: request.customerSignedAt ?? null,
      name: request.customerSignatureName ?? null,
      data: request.customerSignatureData ?? null,
      note: request.customerSignatureNote ?? null,
      method: request.customerSignatureMethod ?? null,
    },
  };
}

export type InstallationReportDetail = Awaited<ReturnType<typeof getInstallationReportDetail>>;

/** Marks that the report has been produced. Idempotent — the first open wins. */
export async function stampReportGenerated(id: string): Promise<void> {
  const repo = Source.getRepository(InstallationRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request || request.reportGeneratedAt) return;
  request.reportGeneratedAt = new Date();
  await repo.save(request);
}

function assertSignable(request: InstallationRequest) {
  // A report describes a finished job. Signing one that is still running would capture
  // a duration and a meter reading that are not final.
  if (request.status !== 'COMPLETED' || !request.endTime) {
    throw new AppError('The installation must be completed before its report can be signed.', 400);
  }
}

export async function issueInstallationSigningToken(
  id: string,
): Promise<{ token: string; expiresAt: Date }> {
  const repo = Source.getRepository(InstallationRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Installation request not found', 404);
  assertSignable(request);
  if (request.customerSignedAt) {
    throw new AppError('This installation report has already been signed.', 400);
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  request.signingToken = token;
  request.signingTokenExpiresAt = expiresAt;
  request.signingTokenUsed = false;
  await repo.save(request);
  return { token, expiresAt };
}

export async function signInstallationReport(
  id: string,
  params: {
    signatureName: string;
    signatureData: string;
    note?: string;
    method: 'IN_PERSON' | 'REMOTE_LINK';
  },
): Promise<InstallationRequest> {
  const repo = Source.getRepository(InstallationRequest);
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError('Installation request not found', 404);
  assertSignable(request);

  // Signing is terminal: a signature is the customer's acceptance of a specific set of
  // facts, so it is never silently overwritten by a second signing.
  if (request.customerSignedAt) {
    throw new AppError('This installation report has already been signed.', 400);
  }
  if (!params.signatureName?.trim()) throw new AppError('A signatory name is required.', 400);
  if (!params.signatureData?.startsWith('data:image/')) {
    throw new AppError('A signature is required.', 400);
  }

  request.customerSignedAt = new Date();
  request.customerSignatureName = params.signatureName.trim();
  request.customerSignatureData = params.signatureData;
  request.customerSignatureNote = params.note?.trim() || undefined;
  request.customerSignatureMethod = params.method;
  // Burn the link whichever way it was signed, so a still-circulating URL cannot be
  // reused after an in-person signature.
  request.signingTokenUsed = true;
  return repo.save(request);
}

/** Resolves a public signing token to its request, enforcing single use and expiry. */
export async function resolveSigningToken(token: string): Promise<InstallationRequest> {
  const request = await Source.getRepository(InstallationRequest).findOne({
    where: { signingToken: token },
  });
  if (!request) throw new AppError('Invalid or expired signing link', 404);
  if (request.customerSignedAt) {
    throw new AppError('This installation report has already been signed', 410);
  }
  if (request.signingTokenUsed) throw new AppError('This link has already been used', 410);
  if (request.signingTokenExpiresAt && request.signingTokenExpiresAt < new Date()) {
    throw new AppError('This link has expired', 410);
  }
  return request;
}
