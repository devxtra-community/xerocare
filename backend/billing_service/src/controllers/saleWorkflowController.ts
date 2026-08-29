import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';
import { FindOptionsWhere, In } from 'typeorm';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { ContractAgreement } from '../entities/contractAgreementEntity';
import { InstallationRequest } from '../entities/installationRequestEntity';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { DeliveryStatus } from '../entities/enums/deliveryStatus';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { InvoiceLedger } from '../entities/invoiceLedgerEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { Cheque } from '../entities/chequeEntity';
import {
  GuaranteeCheque,
  GuaranteeChequeStatus,
  GuaranteeChequePurpose,
} from '../entities/guaranteeChequeEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { r2 } from '../config/r2';
import { createSalePaymentRequest } from '../services/salePaymentRequestService';
import { requireCashAccount, postCashbookEntry } from '../services/cashbookService';

import { logger } from '../config/logger';
import { r2SignedGetUrl } from '../utils/r2Url';

/**
 * Signed agreements are private: the row stores an object key, so responses
 * carry a short-lived signed link instead of an unfetchable raw key.
 */
const withSignedAgreementDoc = async <T extends { customerSignedDocumentUrl?: string }>(
  agreement: T,
): Promise<T> => ({
  ...agreement,
  customerSignedDocumentUrl:
    (await r2SignedGetUrl(agreement.customerSignedDocumentUrl)) ??
    agreement.customerSignedDocumentUrl,
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeServiceToken() {
  return sign({ userId: 'billing_service', role: 'ADMIN' }, process.env.ACCESS_SECRET as string, {
    expiresIn: '1m',
  });
}

async function fetchEmployeeName(employeeId: string): Promise<string> {
  try {
    const empUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const res = await fetch(`${empUrl}/employee/${employeeId}`, {
      headers: { Authorization: `Bearer ${makeServiceToken()}`, 'x-internal-service': 'billing' },
    });
    if (!res.ok) return 'Employee';
    const data = await res.json();
    const emp = data.data ?? data;
    const first = emp.first_name || emp.firstName || '';
    const last = emp.last_name || emp.lastName || '';
    return `${first} ${last}`.trim() || emp.email || 'Employee';
  } catch {
    return 'Employee';
  }
}

// ─── Number generators ────────────────────────────────────────────────────────

async function generateAgreementNumber(): Promise<string> {
  const repo = Source.getRepository(ContractAgreement);
  const year = new Date().getFullYear();
  const count = await repo
    .createQueryBuilder('ca')
    .where(`EXTRACT(YEAR FROM ca."createdAt") = :year`, { year })
    .getCount();
  const seq = String(count + 1).padStart(3, '0');
  return `CA-${year}-${seq}`;
}

// ─── Contract Agreement ───────────────────────────────────────────────────────

export const getContractAgreement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const repo = Source.getRepository(ContractAgreement);

    const agreement = await repo.findOne({ where: { invoiceId: id } });
    res.json({ success: true, data: agreement ? await withSignedAgreementDoc(agreement) : null });
  } catch (err) {
    next(err);
  }
};

export const createOrGetContractAgreement = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { userId, branchId } = req.user!;
    const {
      customerName,
      customerAddress,
      customerPhone,
      customerEmail,
      customerVatNumber,
      dealerName,
      dealerAddress,
      dealerPhone,
      termsAndConditions,
    } = req.body;

    const repo = Source.getRepository(ContractAgreement);

    // Return existing if present
    const existing = await repo.findOne({ where: { invoiceId: id } });
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    // Verify invoice exists and belongs to this branch
    const invoice = await Source.getRepository(Invoice).findOne({ where: { id } });
    if (!invoice) throw new AppError('Invoice not found', 404);
    if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);

    // Contract agreements exist for RENT and LEASE only — a Sale is a one-off transaction
    // covered by its invoice, and Sale agreements were removed. That removal was applied
    // in the UI alone, so the endpoint still happily minted a numbered, signable agreement
    // for any Sale invoice anyone posted to it directly.
    const agreementSaleType = (invoice.saleType ?? '').toUpperCase();
    if (agreementSaleType !== 'RENT' && agreementSaleType !== 'LEASE') {
      throw new AppError(
        'Contract agreements apply to Rent and Lease contracts only — a Sale is covered by its invoice.',
        400,
      );
    }

    const empName = await fetchEmployeeName(userId);

    // generateAgreementNumber() is count-based (no locking), so two requests racing
    // — for this same invoice, or for two different RENT/LEASE invoices created at
    // the same moment — can compute the same next number. The DB-level unique index
    // on agreementNumber (and on invoiceId) turns that into a 23505 constraint error
    // instead of a silent duplicate; retry past it a few times rather than surfacing
    // a raw 500 to whichever request lost the race.
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const agreementNumber = await generateAgreementNumber();
      const agreement = repo.create({
        agreementNumber,
        invoiceId: id,
        branchId,
        contractDate: new Date(),
        customerName: customerName || 'Customer',
        customerAddress,
        customerPhone,
        customerEmail,
        customerVatNumber,
        createdByEmployeeId: userId,
        createdByEmployeeName: empName,
        dealerName: dealerName || 'Branch',
        dealerAddress,
        dealerPhone,
        termsAndConditions,
        signatureStatus: 'PENDING_SIGNATURES',
      });

      try {
        await repo.save(agreement);
        return res
          .status(201)
          .json({ success: true, data: await withSignedAgreementDoc(agreement) });
      } catch (err) {
        const dbErr = err as Error & { code?: string };
        if (dbErr.code !== '23505') throw err;

        // Someone else's concurrent request landed first. If it was for this same
        // invoice, that's the real "get" half of get-or-create — return it. Otherwise
        // it was an agreementNumber collision from a different invoice; loop and
        // regenerate.
        const winner = await repo.findOne({ where: { invoiceId: id } });
        if (winner) return res.json({ success: true, data: winner });
        if (attempt === MAX_ATTEMPTS) throw err;
      }
    }
  } catch (err) {
    next(err);
  }
};

export const signContractEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId, branchId } = req.user!;
    const { signatureData } = req.body;

    if (!signatureData) throw new AppError('Signature data is required', 400);

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { invoiceId: id } });
    if (!agreement) throw new AppError('Contract agreement not found', 404);
    if (agreement.branchId !== branchId) throw new AppError('Access denied', 403);

    const empName = await fetchEmployeeName(userId);
    agreement.employeeSignatureData = signatureData;
    agreement.employeeSignedById = userId;
    agreement.employeeSignedByName = empName;
    agreement.employeeSignedAt = new Date();

    // Update composite status — UPLOAD flow uses customerSignedDocumentUrl, not customerSignatureData
    const customerHasSigned =
      agreement.customerSignatureData || agreement.customerSignedDocumentUrl;
    agreement.signatureStatus = customerHasSigned ? 'FULLY_SIGNED' : 'EMPLOYEE_SIGNED';

    await repo.save(agreement);
    res.json({ success: true, data: await withSignedAgreementDoc(agreement) });
  } catch (err) {
    next(err);
  }
};

export const signContractCustomerInPerson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { branchId } = req.user!;
    const { signatureData, customerName } = req.body;

    if (!signatureData) throw new AppError('Signature data is required', 400);

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { invoiceId: id } });
    if (!agreement) throw new AppError('Contract agreement not found', 404);
    if (agreement.branchId !== branchId) throw new AppError('Access denied', 403);

    agreement.customerSignatureData = signatureData;
    agreement.customerSignedByName = customerName || agreement.customerName;
    agreement.customerSignedMethod = 'IN_PERSON';
    agreement.customerSignedAt = new Date();

    agreement.signatureStatus = agreement.employeeSignatureData
      ? 'FULLY_SIGNED'
      : 'CUSTOMER_SIGNED';

    await repo.save(agreement);
    res.json({ success: true, data: await withSignedAgreementDoc(agreement) });
  } catch (err) {
    next(err);
  }
};

export const signContractCustomerByUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { branchId } = req.user!;
    const { customerName, attestationNote } = req.body;

    if (!attestationNote?.trim()) {
      throw new AppError(
        'Attestation note is required — document how/when the signed copy was obtained',
        400,
      );
    }

    const uploadedFile = req.file as (Express.MulterS3.File & { key: string }) | undefined;
    if (!uploadedFile) throw new AppError('Signed document file is required', 400);

    // Signed customer agreements are private — store the key, sign on read.
    const documentUrl = uploadedFile.key;

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { invoiceId: id } });
    if (!agreement) throw new AppError('Contract agreement not found', 404);
    if (agreement.branchId !== branchId) throw new AppError('Access denied', 403);

    agreement.customerSignedDocumentUrl = documentUrl;
    agreement.customerSignedDocumentNote = attestationNote.trim();
    agreement.customerSignedByName = customerName || agreement.customerName;
    agreement.customerSignedMethod = 'UPLOAD';
    agreement.customerSignedAt = new Date();

    agreement.signatureStatus = agreement.employeeSignatureData
      ? 'FULLY_SIGNED'
      : 'CUSTOMER_SIGNED';

    await repo.save(agreement);
    res.json({ success: true, data: await withSignedAgreementDoc(agreement) });
  } catch (err) {
    next(err);
  }
};

// Shared by the HTTP handler below and the email/WhatsApp senders further down —
// both need a fresh 72-hour signing link, not just the manual "Generate Signing
// Link" button in the Remote Link tab.
async function issueSigningToken(agreement: ContractAgreement): Promise<{ token: string }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  agreement.signingToken = token;
  agreement.signingTokenExpiresAt = expiresAt;
  agreement.signingTokenUsed = false;
  await Source.getRepository(ContractAgreement).save(agreement);

  return { token };
}

// Single source of truth for the base URL every customer-facing remote link (Contract
// Agreement signing, Bill approval — Receipt already uses R2_PUBLIC_URL directly and
// doesn't go through here) is built from. Previously each link builder had its own
// `process.env.FRONTEND_URL || 'http://localhost:3000'` fallback, and FRONTEND_URL was
// never actually set in any environment — every emailed link silently pointed at
// localhost:3000, unreachable from a customer's phone (ERR_CONNECTION_REFUSED) with no
// warning anywhere. Falling back to localhost now logs loudly on every use so this can
// never again ship silently broken.
function publicAppUrl(): string {
  const base = process.env.PUBLIC_APP_URL;
  if (base) return base.replace(/\/$/, '');
  logger.error(
    'PUBLIC_APP_URL is not set — customer-facing links are falling back to localhost:3000, ' +
      'which is unreachable from anywhere but this machine. Set PUBLIC_APP_URL to the real, ' +
      'publicly-reachable application URL.',
  );
  return 'http://localhost:3000';
}

function signingLinkUrl(token: string): string {
  return `${publicAppUrl()}/public/contract/sign/${token}`;
}

export const generateSigningToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { branchId } = req.user!;

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { invoiceId: id } });
    if (!agreement) throw new AppError('Contract agreement not found', 404);
    if (agreement.branchId !== branchId) throw new AppError('Access denied', 403);

    const { token } = await issueSigningToken(agreement);
    res.json({ success: true, data: { token, expiresAt: agreement.signingTokenExpiresAt } });
  } catch (err) {
    next(err);
  }
};

// Emails the customer a link to review (and remotely sign, if not yet signed) the
// contract agreement — reuses the same 72-hour signing link as the Remote Link tab,
// so this and "Generate Signing Link" are two doors into the same mechanism rather
// than a second implementation. Available regardless of signature status: Finance/
// Employee may want to send the document for the customer's records even after
// it's fully signed, not just while a signature is still pending.
export const sendContractAgreementEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { branchId } = req.user!;
    const { recipient: recipientOverride } = (req.body ?? {}) as { recipient?: string };

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { invoiceId: id } });
    if (!agreement) throw new AppError('Contract agreement not found', 404);
    if (agreement.branchId !== branchId) throw new AppError('Access denied', 403);

    // Prefer a live CRM lookup over agreement.customerEmail, which is only a copy
    // taken at agreement-creation time — if the customer's email is corrected in
    // their real Customer record afterward, this send would otherwise silently
    // keep mailing the old address forever. Falls back to the cached copy only
    // if CRM has nothing (unreachable, no customerId on this contract, etc.).
    let recipient = recipientOverride?.trim();
    if (!recipient) {
      const invoiceForContact = await Source.getRepository(Invoice).findOne({
        where: { id: agreement.invoiceId },
        select: ['customerId'],
      });
      const contact = await fetchCustomerContact(invoiceForContact?.customerId);
      recipient = contact?.email || agreement.customerEmail;
    }
    if (!recipient)
      throw new AppError('Customer email not found. Please provide a recipient email.', 400);

    const { token } = await issueSigningToken(agreement);
    const link = signingLinkUrl(token);
    const isFullySigned = agreement.signatureStatus === 'FULLY_SIGNED';

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;color:#fff">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;opacity:.75;text-transform:uppercase;letter-spacing:.1em">Contract Agreement</p>
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:900;letter-spacing:-.5px">${agreement.agreementNumber}</h1>
    <p style="margin:0;font-size:13px;opacity:.8">${agreement.dealerName}</p>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 20px;font-size:14px;color:#374151">Dear <strong>${agreement.customerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151">
      ${
        isFullySigned
          ? `Please find your fully signed contract agreement with <strong>${agreement.dealerName}</strong> below, for your records.`
          : `Your contract agreement with <strong>${agreement.dealerName}</strong> is ready for review${agreement.customerSignatureData ? '' : ' and signature'}.`
      }
    </p>
    <div style="margin-top:8px;text-align:center">
      <a href="${link}" target="_blank" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:12px 28px;border-radius:8px">${isFullySigned ? 'View Signed Agreement' : 'Review & Sign Agreement'}</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center">This link is valid for 72 hours.</p>
  </div>
</div>`;

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    await NotificationPublisher.publishEmailRequest({
      recipient,
      subject: `Contract Agreement — ${agreement.agreementNumber}`,
      body: htmlBody,
      invoiceId: agreement.invoiceId,
      attachmentUrl: link,
    });

    logger.info(`[ContractAgreement] Email queued for ${agreement.agreementNumber} → ${recipient}`);
    // Return the link actually used — a fresh token is minted on every send, which
    // supersedes whatever the Remote Link tab may already be displaying. The caller
    // uses this to keep that display in sync rather than silently going stale.
    res.json({ success: true, data: { message: 'Agreement email queued', recipient, link } });
  } catch (err) {
    next(err);
  }
};

export const sendContractAgreementWhatsApp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { branchId } = req.user!;
    const { recipient: recipientOverride } = (req.body ?? {}) as { recipient?: string };

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { invoiceId: id } });
    if (!agreement) throw new AppError('Contract agreement not found', 404);
    if (agreement.branchId !== branchId) throw new AppError('Access denied', 403);

    const recipient = recipientOverride?.trim() || agreement.customerPhone;
    if (!recipient)
      throw new AppError('Customer phone not found. Please provide a recipient number.', 400);

    const { token } = await issueSigningToken(agreement);
    const link = signingLinkUrl(token);
    const isFullySigned = agreement.signatureStatus === 'FULLY_SIGNED';

    const body =
      `Dear ${agreement.customerName},\n\n` +
      (isFullySigned
        ? `Your fully signed contract agreement with ${agreement.dealerName} is ready.\n\n`
        : `Your contract agreement with ${agreement.dealerName} is ready for review${agreement.customerSignatureData ? '' : ' and signature'}.\n\n`) +
      `Agreement No: ${agreement.agreementNumber}\n\n` +
      `${isFullySigned ? 'View' : 'Review & sign'}: ${link}\n\n` +
      `Link valid for 72 hours.`;

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    await NotificationPublisher.publishWhatsappRequest({
      recipient,
      body,
      invoiceId: agreement.invoiceId,
    });

    logger.info(
      `[ContractAgreement] WhatsApp queued for ${agreement.agreementNumber} → ${recipient}`,
    );
    res.json({ success: true, data: { message: 'Agreement WhatsApp queued', recipient, link } });
  } catch (err) {
    next(err);
  }
};

// Public endpoint — no auth required
export const signContractRemote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const { signatureData, customerName } = req.body;

    if (!signatureData) throw new AppError('Signature data is required', 400);

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { signingToken: token } });
    if (!agreement) throw new AppError('Invalid or expired signing link', 404);
    if (agreement.signingTokenUsed)
      throw new AppError('This signing link has already been used', 410);
    if (agreement.signingTokenExpiresAt && agreement.signingTokenExpiresAt < new Date()) {
      throw new AppError('This signing link has expired', 410);
    }

    agreement.customerSignatureData = signatureData;
    agreement.customerSignedByName = customerName || agreement.customerName;
    agreement.customerSignedMethod = 'REMOTE';
    agreement.customerSignedAt = new Date();
    agreement.signingTokenUsed = true;

    agreement.signatureStatus = agreement.employeeSignatureData
      ? 'FULLY_SIGNED'
      : 'CUSTOMER_SIGNED';

    await repo.save(agreement);

    // Let the employee who created this contract know without them having to keep
    // reopening it to check — mirrors the reminder pattern in cron.ts.
    if (agreement.createdByEmployeeId) {
      const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
      await NotificationPublisher.publishInAppRequest({
        recipientId: agreement.createdByEmployeeId,
        title: 'Customer signed contract agreement',
        message: `${agreement.customerSignedByName || agreement.customerName} has signed agreement ${agreement.agreementNumber}.`,
        type: 'SUCCESS',
        referenceId: agreement.invoiceId,
        referenceType: 'CONTRACT',
      }).catch((err) => logger.error('Failed to publish contract-signed notification', { err }));
    }

    // Return minimal data for the public confirmation page
    res.json({
      success: true,
      data: {
        agreementNumber: agreement.agreementNumber,
        customerName: agreement.customerName,
        signedAt: agreement.customerSignedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Public endpoint — get contract data for the signing page
export const getContractForSigning = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { signingToken: token } });
    if (!agreement) throw new AppError('Invalid or expired signing link', 404);
    if (agreement.signingTokenUsed)
      throw new AppError('This signing link has already been used', 410);
    if (agreement.signingTokenExpiresAt && agreement.signingTokenExpiresAt < new Date()) {
      throw new AppError('This signing link has expired', 410);
    }

    // Previously returned a hand-picked "safe subset" of the agreement alone — no
    // linked invoice at all, so the customer never saw the actual contract (equipment,
    // pricing/rent/lease terms, advance/deposit, warranty), only a name/date summary
    // card. This is the customer's own contract behind a private, single-use,
    // 72-hour token, so there's no more reason to withhold it here than there is from
    // the authenticated employee-facing view rendering the identical
    // ContractDocumentBody — only truly internal identifiers (employee/branch/creator
    // ids) are left out.
    const invoice = await Source.getRepository(Invoice).findOne({
      where: { id: agreement.invoiceId },
      relations: ['items', 'productAllocations'],
    });

    const agreementSafe: Partial<ContractAgreement> = { ...agreement };
    delete agreementSafe.id;
    delete agreementSafe.branchId;
    delete agreementSafe.createdByEmployeeId;
    delete agreementSafe.employeeSignedById;
    delete agreementSafe.signingToken;

    res.json({
      success: true,
      data: {
        agreement: agreementSafe,
        invoice,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Bill (UsageRecord) creation + customer approval — Stage A ────────────────
// Mirrors the Contract Agreement signing-token/remote-approval mechanism above,
// but anchored to a UsageRecord (one per billing period, doubling as that
// period's Bill) rather than a dedicated agreement entity.

function billSigningLinkUrl(token: string): string {
  return `${publicAppUrl()}/public/bill/sign/${token}`;
}

async function issueBillSigningToken(usage: UsageRecord): Promise<{ token: string }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  usage.signingToken = token;
  usage.signingTokenExpiresAt = expiresAt;
  usage.signingTokenUsed = false;
  await Source.getRepository(UsageRecord).save(usage);

  return { token };
}

async function loadBillForBranch(usageRecordId: string, branchId: string) {
  const usage = await Source.getRepository(UsageRecord).findOne({
    where: { id: usageRecordId },
    relations: ['items'],
  });
  if (!usage) throw new AppError('Bill not found', 404);
  // 'items' + 'productAllocations' — the Advance Bill needs the machine's initial reading
  // (BillDocumentBody's ContractDetailsSection), which lives on productAllocations; this
  // was missing entirely here (unlike getBillForSigning's equivalent query, which already
  // fetches both), so the Finance-facing Bill view had no reading data to show at all.
  const invoice = await Source.getRepository(Invoice).findOne({
    where: { id: usage.contractId },
    relations: ['items', 'productAllocations'],
  });
  if (!invoice) throw new AppError('Contract not found', 404);
  if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);
  return { usage, invoice };
}

function billPeriodLabel(usage: UsageRecord): string {
  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const start = fmt(usage.billingPeriodStart);
  const end = fmt(usage.billingPeriodEnd);
  return start === end ? start : `${start} to ${end}`;
}

export const getBill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, role } = req.user!;
    const { usage, invoice } = await loadBillForBranch(req.params.id as string, branchId).catch(
      async (err) => {
        if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) throw err;
        // ADMIN/SUPER_ADMIN can view any branch's bill — retry without the branch check.
        const usage = await Source.getRepository(UsageRecord).findOne({
          where: { id: req.params.id as string },
          relations: ['items'],
        });
        if (!usage) throw new AppError('Bill not found', 404);
        const invoice = await Source.getRepository(Invoice).findOne({
          where: { id: usage.contractId },
          relations: ['items', 'productAllocations'],
        });
        if (!invoice) throw new AppError('Contract not found', 404);
        return { usage, invoice };
      },
    );

    // Advance/Security Deposit Bills wrap an already-collected RENT_ADVANCE/LEASE_ADVANCE
    // or RENT_SECURITY_DEPOSIT/LEASE_SECURITY_DEPOSIT payment — the document needs its
    // amount/mode/date/status, not just the bill's own approval state. Field stays named
    // advancePayment for both billTypes — see BillDocumentBody's Props comment.
    //
    // An ADVANCE bill also carries the deposit payment (if one exists) as depositPayment —
    // a deposit is shown as a section within the First Month Advance Bill now, not as its
    // own separate document, so viewing the Advance Bill needs both regardless of billType.
    // totalCharge/taxableAmount on `usage` stay advance-only throughout — the deposit is
    // display-only here, never folded into the bill's own charged amount (it's a refundable
    // liability, not revenue; see the AR-exclusion comments in accountsShared.ts for why
    // that separation matters elsewhere too).
    let advancePayment: SalePaymentRequest | null = null;
    let depositPayment: SalePaymentRequest | null = null;
    if (usage.billType === 'ADVANCE') {
      [advancePayment, depositPayment] = await Promise.all([
        Source.getRepository(SalePaymentRequest).findOne({
          where: {
            invoiceId: usage.contractId,
            paymentContext: In(['RENT_ADVANCE', 'LEASE_ADVANCE']),
          },
          order: { createdAt: 'ASC' },
        }),
        Source.getRepository(SalePaymentRequest).findOne({
          where: {
            invoiceId: usage.contractId,
            paymentContext: In(['RENT_SECURITY_DEPOSIT', 'LEASE_SECURITY_DEPOSIT']),
            status: In(['PENDING', 'APPROVED']),
          },
          order: { createdAt: 'ASC' },
        }),
      ]);
    } else if (usage.billType === 'SECURITY_DEPOSIT') {
      // Deposit-only edge case (no advance was ever collected on this contract) — the
      // standalone Security Deposit Bill flow still exists for exactly this.
      advancePayment = await Source.getRepository(SalePaymentRequest).findOne({
        where: {
          invoiceId: usage.contractId,
          paymentContext: In(['RENT_SECURITY_DEPOSIT', 'LEASE_SECURITY_DEPOSIT']),
        },
        order: { createdAt: 'ASC' },
      });
    }

    res.json({ success: true, data: { usage, invoice, advancePayment, depositPayment } });
  } catch (err) {
    next(err);
  }
};

// Get-or-create an Advance Bill — wraps the contract's already-collected RENT_ADVANCE/
// LEASE_ADVANCE SalePaymentRequest for customer sign-off. Same UsageRecord table/
// approval-pipeline as a periodic usage Bill, just billType='ADVANCE' and no period/
// readings. Idempotent: returns the existing one if Finance clicks "Generate" again.
export const generateAdvanceBill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractId = req.params.contractId as string;
    const { userId, branchId } = req.user!;

    const invoice = await Source.getRepository(Invoice).findOne({ where: { id: contractId } });
    if (!invoice) throw new AppError('Contract not found', 404);
    if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);

    const usageRepo = Source.getRepository(UsageRecord);
    const existing = await usageRepo.findOne({ where: { contractId, billType: 'ADVANCE' } });
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const advancePayment = await Source.getRepository(SalePaymentRequest).findOne({
      where: { invoiceId: contractId, paymentContext: In(['RENT_ADVANCE', 'LEASE_ADVANCE']) },
      order: { createdAt: 'ASC' },
    });
    if (!advancePayment) {
      throw new AppError('No advance payment has been recorded for this contract yet', 400);
    }

    const billCreatedByName = await fetchEmployeeName(userId);
    const advanceDate = new Date(advancePayment.paymentDate);

    const usage = usageRepo.create({
      contract: { id: contractId } as Invoice,
      billType: 'ADVANCE',
      billingPeriodStart: advanceDate,
      billingPeriodEnd: advanceDate,
      totalCharge: Number(advancePayment.amount),
      taxableAmount: Number(advancePayment.taxableAmount ?? advancePayment.amount),
      taxAmount: Number(advancePayment.taxAmount ?? 0),
      taxPercent: advancePayment.taxPercent ?? undefined,
      reportedBy: 'EMPLOYEE' as UsageRecord['reportedBy'],
      billStatus: 'PENDING_APPROVAL',
      billCreatedByEmployeeId: userId,
      billCreatedByName,
    });
    await usageRepo.save(usage);

    res.status(201).json({ success: true, data: usage });
  } catch (err) {
    next(err);
  }
};

// Batch check for the Finance Rent/Lease page's "Generate Advance Bill" button — whether
// each contract has an advance payment recorded at all, and whether an Advance Bill
// already exists for it (and its status), without one round trip per row.
export const getAdvanceBillStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.user!;
    const contractIds = String(req.query.contractIds ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (contractIds.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const invoices = await Source.getRepository(Invoice).find({
      where: { id: In(contractIds), branchId },
      select: ['id'],
    });
    const scopedIds = invoices.map((i) => i.id);
    if (scopedIds.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const [advancePayments, advanceBills] = await Promise.all([
      Source.getRepository(SalePaymentRequest).find({
        where: { invoiceId: In(scopedIds), paymentContext: In(['RENT_ADVANCE', 'LEASE_ADVANCE']) },
      }),
      Source.getRepository(UsageRecord).find({
        where: { contractId: In(scopedIds), billType: 'ADVANCE' },
      }),
    ]);
    const hasAdvanceSet = new Set(advancePayments.map((p) => p.invoiceId));
    const billByContractId = new Map(advanceBills.map((b) => [b.contractId, b]));

    const result: Record<
      string,
      { hasAdvancePayment: boolean; advanceBillId?: string; advanceBillStatus?: string }
    > = {};
    for (const contractId of scopedIds) {
      const bill = billByContractId.get(contractId);
      result[contractId] = {
        hasAdvancePayment: hasAdvanceSet.has(contractId),
        advanceBillId: bill?.id,
        advanceBillStatus: bill?.billStatus,
      };
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// Get-or-create a Security Deposit Bill — mirrors generateAdvanceBill exactly, wrapping
// the contract's already-collected RENT_SECURITY_DEPOSIT/LEASE_SECURITY_DEPOSIT
// SalePaymentRequest instead. Same UsageRecord table/approval-pipeline, just
// billType='SECURITY_DEPOSIT' and no period/readings. Idempotent.
export const generateSecurityDepositBill = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const contractId = req.params.contractId as string;
    const { userId, branchId } = req.user!;

    const invoice = await Source.getRepository(Invoice).findOne({ where: { id: contractId } });
    if (!invoice) throw new AppError('Contract not found', 404);
    if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);

    const usageRepo = Source.getRepository(UsageRecord);
    const existing = await usageRepo.findOne({
      where: { contractId, billType: 'SECURITY_DEPOSIT' },
    });
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const depositPayment = await Source.getRepository(SalePaymentRequest).findOne({
      where: {
        invoiceId: contractId,
        paymentContext: In(['RENT_SECURITY_DEPOSIT', 'LEASE_SECURITY_DEPOSIT']),
      },
      order: { createdAt: 'ASC' },
    });
    if (!depositPayment) {
      throw new AppError(
        'No security deposit payment has been recorded for this contract yet',
        400,
      );
    }

    const billCreatedByName = await fetchEmployeeName(userId);
    const depositDate = new Date(depositPayment.paymentDate);

    const usage = usageRepo.create({
      contract: { id: contractId } as Invoice,
      billType: 'SECURITY_DEPOSIT',
      billingPeriodStart: depositDate,
      billingPeriodEnd: depositDate,
      totalCharge: Number(depositPayment.amount),
      taxableAmount: Number(depositPayment.taxableAmount ?? depositPayment.amount),
      taxAmount: Number(depositPayment.taxAmount ?? 0),
      taxPercent: depositPayment.taxPercent ?? undefined,
      reportedBy: 'EMPLOYEE' as UsageRecord['reportedBy'],
      billStatus: 'PENDING_APPROVAL',
      billCreatedByEmployeeId: userId,
      billCreatedByName,
    });
    await usageRepo.save(usage);

    res.status(201).json({ success: true, data: usage });
  } catch (err) {
    next(err);
  }
};

// Batch check for the "Generate Security Deposit Bill" button — mirrors
// getAdvanceBillStatus — whether each contract has a security deposit payment recorded
// at all, and whether a Security Deposit Bill already exists for it (and its status).
export const getSecurityDepositBillStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { branchId } = req.user!;
    const contractIds = String(req.query.contractIds ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (contractIds.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const invoices = await Source.getRepository(Invoice).find({
      where: { id: In(contractIds), branchId },
      select: ['id'],
    });
    const scopedIds = invoices.map((i) => i.id);
    if (scopedIds.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const [depositPayments, depositBills] = await Promise.all([
      Source.getRepository(SalePaymentRequest).find({
        where: {
          invoiceId: In(scopedIds),
          paymentContext: In(['RENT_SECURITY_DEPOSIT', 'LEASE_SECURITY_DEPOSIT']),
        },
      }),
      Source.getRepository(UsageRecord).find({
        where: { contractId: In(scopedIds), billType: 'SECURITY_DEPOSIT' },
      }),
    ]);
    const hasDepositSet = new Set(depositPayments.map((p) => p.invoiceId));
    const billByContractId = new Map(depositBills.map((b) => [b.contractId, b]));

    const result: Record<
      string,
      {
        hasSecurityDepositPayment: boolean;
        securityDepositBillId?: string;
        securityDepositBillStatus?: string;
      }
    > = {};
    for (const contractId of scopedIds) {
      const bill = billByContractId.get(contractId);
      result[contractId] = {
        hasSecurityDepositPayment: hasDepositSet.has(contractId),
        securityDepositBillId: bill?.id,
        securityDepositBillStatus: bill?.billStatus,
      };
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// "Edit & Resend" for a disputed Advance or Security Deposit Bill — unlike a periodic
// usage Bill, there is nothing to recompute here: the amount is the real, already-collected
// payment, and letting Finance change it via this endpoint would bypass the actual
// payment-correction channel. So this just resets the approval trail so a corrected send
// can go out again — the same field-reset updateUsageRecord already does for the USAGE case.
export const resetBillForResend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.user!;
    const { usage } = await loadBillForBranch(req.params.id as string, branchId);
    if (usage.billType !== 'ADVANCE' && usage.billType !== 'SECURITY_DEPOSIT') {
      throw new AppError(
        'Only Advance or Security Deposit Bills can be reset this way — edit a usage Bill via its reading-correction flow instead',
        400,
      );
    }

    usage.billStatus = 'PENDING_APPROVAL';
    usage.customerApprovedByName = undefined;
    usage.customerApprovedAt = undefined;
    usage.customerApprovalMethod = undefined;
    usage.customerApprovalNote = undefined;
    usage.customerRejectionReason = undefined;
    usage.customerRejectedAt = undefined;
    usage.signingToken = undefined;
    usage.signingTokenExpiresAt = undefined;
    usage.signingTokenUsed = false;
    await Source.getRepository(UsageRecord).save(usage);

    res.json({ success: true, data: usage });
  } catch (err) {
    next(err);
  }
};

export const generateBillSigningToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.user!;
    const { usage } = await loadBillForBranch(req.params.id as string, branchId);
    const { token } = await issueBillSigningToken(usage);
    res.json({ success: true, data: { token, expiresAt: usage.signingTokenExpiresAt } });
  } catch (err) {
    next(err);
  }
};

export const sendBillEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.user!;
    const { recipient: recipientOverride } = (req.body ?? {}) as { recipient?: string };
    const { usage, invoice } = await loadBillForBranch(req.params.id as string, branchId);

    // Live CRM lookup first — see the identical comment in sendContractAgreementEmail
    // for why (the Contract Agreement's cached customerEmail this used to read
    // straight from can go stale). Falls back to that cached copy if CRM has
    // nothing.
    let recipient = recipientOverride?.trim();
    if (!recipient) {
      const contact = await fetchCustomerContact(invoice.customerId);
      recipient = contact?.email;
    }
    if (!recipient) {
      const agreement = await Source.getRepository(ContractAgreement).findOne({
        where: { invoiceId: usage.contractId },
      });
      recipient = agreement?.customerEmail;
    }
    if (!recipient)
      throw new AppError('Customer email not found. Please provide a recipient email.', 400);

    const { token } = await issueBillSigningToken(usage);
    const link = billSigningLinkUrl(token);
    const periodLabel = billPeriodLabel(usage);

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:linear-gradient(135deg,#0d9488,#059669);padding:28px 32px;color:#fff">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;opacity:.75;text-transform:uppercase;letter-spacing:.1em">Bill for ${periodLabel}</p>
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:900;letter-spacing:-.5px">${invoice.invoiceNumber}</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 20px;font-size:14px;color:#374151">Dear <strong>${invoice.customerName || 'Customer'}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151">
      Your bill for the period <strong>${periodLabel}</strong> is ready for review — total amount
      <strong>${Number(usage.totalCharge).toFixed(2)}</strong>.
    </p>
    <div style="margin-top:8px;text-align:center">
      <a href="${link}" target="_blank" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:12px 28px;border-radius:8px">Review & Approve Bill</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center">This link is valid for 72 hours.</p>
  </div>
</div>`;

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    await NotificationPublisher.publishEmailRequest({
      recipient,
      subject: `Bill for ${periodLabel} — ${invoice.invoiceNumber}`,
      body: htmlBody,
      invoiceId: invoice.id,
      attachmentUrl: link,
    });

    usage.billSentAt = new Date();
    await Source.getRepository(UsageRecord).save(usage);

    logger.info(`[Bill] Email queued for usage record ${usage.id} → ${recipient}`);
    res.json({ success: true, data: { message: 'Bill email queued', recipient, link } });
  } catch (err) {
    next(err);
  }
};

export const sendBillWhatsApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.user!;
    const { recipient: recipientOverride } = (req.body ?? {}) as { recipient?: string };
    const { usage, invoice } = await loadBillForBranch(req.params.id as string, branchId);

    const agreement = await Source.getRepository(ContractAgreement).findOne({
      where: { invoiceId: usage.contractId },
    });
    const recipient = recipientOverride?.trim() || agreement?.customerPhone;
    if (!recipient)
      throw new AppError('Customer phone not found. Please provide a recipient number.', 400);

    const { token } = await issueBillSigningToken(usage);
    const link = billSigningLinkUrl(token);
    const periodLabel = billPeriodLabel(usage);

    const body =
      `Dear ${invoice.customerName || 'Customer'},\n\n` +
      `Your bill for ${periodLabel} is ready for review — total amount ${Number(usage.totalCharge).toFixed(2)}.\n\n` +
      `Invoice: ${invoice.invoiceNumber}\n\n` +
      `Review & approve: ${link}\n\n` +
      `Link valid for 72 hours.`;

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    await NotificationPublisher.publishWhatsappRequest({ recipient, body, invoiceId: invoice.id });

    usage.billSentAt = new Date();
    await Source.getRepository(UsageRecord).save(usage);

    logger.info(`[Bill] WhatsApp queued for usage record ${usage.id} → ${recipient}`);
    res.json({ success: true, data: { message: 'Bill WhatsApp queued', recipient, link } });
  } catch (err) {
    next(err);
  }
};

// Public endpoint — get bill data for the approval page
export const getBillForSigning = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const repo = Source.getRepository(UsageRecord);
    const usage = await repo.findOne({ where: { signingToken: token }, relations: ['items'] });
    if (!usage) throw new AppError('Invalid or expired bill link', 404);
    if (usage.signingTokenUsed) throw new AppError('This bill link has already been used', 410);
    if (usage.signingTokenExpiresAt && usage.signingTokenExpiresAt < new Date()) {
      throw new AppError('This bill link has expired', 410);
    }

    const invoice = await Source.getRepository(Invoice).findOne({
      where: { id: usage.contractId },
      relations: ['items', 'productAllocations'],
    });

    const usageSafe: Partial<UsageRecord> = { ...usage };
    delete usageSafe.id;
    delete usageSafe.billCreatedByEmployeeId;
    delete usageSafe.signingToken;

    // See getBill's matching comment — an ADVANCE bill carries the deposit payment (if
    // any) as depositPayment now too, since it's shown within this same document.
    let advancePayment: SalePaymentRequest | null = null;
    let depositPayment: SalePaymentRequest | null = null;
    if (usage.billType === 'ADVANCE') {
      [advancePayment, depositPayment] = await Promise.all([
        Source.getRepository(SalePaymentRequest).findOne({
          where: {
            invoiceId: usage.contractId,
            paymentContext: In(['RENT_ADVANCE', 'LEASE_ADVANCE']),
          },
          order: { createdAt: 'ASC' },
        }),
        Source.getRepository(SalePaymentRequest).findOne({
          where: {
            invoiceId: usage.contractId,
            paymentContext: In(['RENT_SECURITY_DEPOSIT', 'LEASE_SECURITY_DEPOSIT']),
            status: In(['PENDING', 'APPROVED']),
          },
          order: { createdAt: 'ASC' },
        }),
      ]);
    } else if (usage.billType === 'SECURITY_DEPOSIT') {
      advancePayment = await Source.getRepository(SalePaymentRequest).findOne({
        where: {
          invoiceId: usage.contractId,
          paymentContext: In(['RENT_SECURITY_DEPOSIT', 'LEASE_SECURITY_DEPOSIT']),
        },
        order: { createdAt: 'ASC' },
      });
    }

    res.json({
      success: true,
      data: { usage: usageSafe, invoice, advancePayment, depositPayment },
    });
  } catch (err) {
    next(err);
  }
};

// Public endpoint — customer approves the bill via the remote link
export const approveBillRemote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const { customerName, signatureData } = req.body;
    if (!customerName?.trim()) throw new AppError('Your name is required', 400);

    const repo = Source.getRepository(UsageRecord);
    const usage = await repo.findOne({ where: { signingToken: token } });
    if (!usage) throw new AppError('Invalid or expired bill link', 404);
    if (usage.signingTokenUsed) throw new AppError('This bill link has already been used', 410);
    if (usage.signingTokenExpiresAt && usage.signingTokenExpiresAt < new Date()) {
      throw new AppError('This bill link has expired', 410);
    }

    usage.billStatus = 'CUSTOMER_APPROVED';
    usage.customerApprovedByName = customerName.trim();
    usage.customerApprovedAt = new Date();
    usage.customerApprovalMethod = 'REMOTE_LINK';
    usage.customerApprovalNote = signatureData ? undefined : usage.customerApprovalNote;
    usage.signingTokenUsed = true;
    await repo.save(usage);

    await notifyBillCreatorOfCustomerDecision(usage, 'APPROVED');

    res.json({
      success: true,
      data: { billingPeriodEnd: usage.billingPeriodEnd, approvedAt: usage.customerApprovedAt },
    });
  } catch (err) {
    next(err);
  }
};

// Let the Finance user who created this bill know as soon as the customer acts on it
// remotely — mirrors signContractRemote's notification and the cron.ts reminder pattern.
// Best-effort: a failure here must never roll back the customer's already-recorded
// decision, so it's caught and logged rather than thrown.
async function notifyBillCreatorOfCustomerDecision(
  usage: UsageRecord,
  decision: 'APPROVED' | 'DISPUTED',
) {
  if (!usage.billCreatedByEmployeeId) return;
  try {
    const invoice = await Source.getRepository(Invoice).findOne({
      where: { id: usage.contractId },
      select: ['invoiceNumber'],
    });
    const label = invoice?.invoiceNumber || usage.contractId;
    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    await NotificationPublisher.publishInAppRequest({
      recipientId: usage.billCreatedByEmployeeId,
      title: decision === 'APPROVED' ? 'Customer approved bill' : 'Customer disputed bill',
      message:
        decision === 'APPROVED'
          ? `${usage.customerApprovedByName} approved the bill for contract ${label}.`
          : `A customer disputed the bill for contract ${label}: "${usage.customerRejectionReason}"`,
      type: decision === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      referenceId: usage.contractId,
      referenceType: 'CONTRACT',
    });
  } catch (err) {
    logger.error('Failed to publish bill-decision notification', { err, usageId: usage.id });
  }
}

// Public endpoint — customer disputes the bill via the remote link
export const rejectBillRemote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const { reason } = req.body;
    if (!reason?.trim()) throw new AppError('A reason is required to dispute this bill', 400);

    const repo = Source.getRepository(UsageRecord);
    const usage = await repo.findOne({ where: { signingToken: token } });
    if (!usage) throw new AppError('Invalid or expired bill link', 404);
    if (usage.signingTokenUsed) throw new AppError('This bill link has already been used', 410);
    if (usage.signingTokenExpiresAt && usage.signingTokenExpiresAt < new Date()) {
      throw new AppError('This bill link has expired', 410);
    }

    usage.billStatus = 'CUSTOMER_REJECTED';
    usage.customerRejectionReason = reason.trim();
    usage.customerRejectedAt = new Date();
    usage.signingTokenUsed = true;
    await repo.save(usage);

    await notifyBillCreatorOfCustomerDecision(usage, 'DISPUTED');

    res.json({ success: true, data: { rejectedAt: usage.customerRejectedAt } });
  } catch (err) {
    next(err);
  }
};

// Finance/Admin/Manager manually marking a bill approved — for a customer's phone/
// in-person confirmation that never went through the remote link. There is no
// evidence-free override anywhere else in this codebase (the closest precedent,
// Contract Agreement's UPLOAD method, always requires an uploaded file + note) — a
// required note is the equivalent minimum bar here, since there's no document to
// attach a bill approval to.
export const markBillApprovedManually = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, branchId } = req.user!;
    if (!['FINANCE', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(role)) {
      throw new AppError('Insufficient role to approve a bill manually', 403);
    }
    const { customerName, approvalNote } = req.body;
    if (!approvalNote?.trim()) {
      throw new AppError(
        'A note is required — document how/when the customer approved this bill',
        400,
      );
    }

    const { usage, invoice } = await loadBillForBranch(req.params.id as string, branchId);

    usage.billStatus = 'CUSTOMER_APPROVED';
    usage.customerApprovedByName = customerName?.trim() || invoice.customerName || 'Customer';
    usage.customerApprovedAt = new Date();
    usage.customerApprovalMethod = 'FINANCE_MANUAL';
    usage.customerApprovalNote = approvalNote.trim();
    await Source.getRepository(UsageRecord).save(usage);

    res.json({ success: true, data: usage });
  } catch (err) {
    next(err);
  }
};

// All bills (UsageRecords) for one contract, with per-bill collected/pending amounts —
// feeds the Accounts Receivable page's "View Bills" drilldown. Deliberately does not
// change the AR page's own headline Outstanding row (see collectPendingUsagePayment's
// approval gate and the plan notes on why totalAmount can't be safely redistributed
// across periods after a final-month settlement).
export const getBillsForContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractId = req.params.contractId as string;
    const { branchId, role } = req.user!;

    const invoice = await Source.getRepository(Invoice).findOne({ where: { id: contractId } });
    if (!invoice) throw new AppError('Contract not found', 404);
    if (invoice.branchId !== branchId && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new AppError('Access denied', 403);
    }

    const usageRecords = await Source.getRepository(UsageRecord)
      .createQueryBuilder('ur')
      .where('ur."contractId" = :contractId', { contractId })
      .orderBy('ur."billingPeriodStart"', 'DESC')
      .getMany();

    if (usageRecords.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const usageRecordIds = usageRecords.map((u) => u.id);
    const payments = await Source.getRepository(SalePaymentRequest)
      .createQueryBuilder('spr')
      .where('spr."usageRecordId" IN (:...ids)', { ids: usageRecordIds })
      .getMany();

    const givenByUsageRecord = new Map<string, number>();
    for (const p of payments) {
      if (p.status === 'REJECTED' || !p.usageRecordId) continue;
      givenByUsageRecord.set(
        p.usageRecordId,
        (givenByUsageRecord.get(p.usageRecordId) || 0) + Number(p.amount),
      );
    }

    const result = usageRecords.map((ur) => {
      // Advance and Security Deposit Bills don't go through Stage B collection at all —
      // that money was already collected via the separate RENT_ADVANCE/LEASE_ADVANCE or
      // RENT_SECURITY_DEPOSIT/LEASE_SECURITY_DEPOSIT payment flow, so there's nothing for
      // "Add Collect Amount" to apply to here; showing it as fully pending (the
      // SalePaymentRequest.usageRecordId join below never matches either payment, since
      // both are linked by invoiceId/paymentContext instead) would be actively misleading
      // and risk a double-collection click.
      const isWrappedPayment = ur.billType === 'ADVANCE' || ur.billType === 'SECURITY_DEPOSIT';
      const given = isWrappedPayment ? Number(ur.totalCharge) : givenByUsageRecord.get(ur.id) || 0;
      return {
        usageRecordId: ur.id,
        billType: ur.billType,
        billingPeriodStart: ur.billingPeriodStart,
        billingPeriodEnd: ur.billingPeriodEnd,
        totalCharge: Number(ur.totalCharge),
        amountGiven: given,
        amountPending: isWrappedPayment ? 0 : Math.max(0, Number(ur.totalCharge) - given),
        billStatus: ur.billStatus,
        billCreatedByName: ur.billCreatedByName,
        customerApprovedByName: ur.customerApprovedByName,
        customerApprovedAt: ur.customerApprovedAt,
        customerApprovalMethod: ur.customerApprovalMethod,
        customerRejectionReason: ur.customerRejectionReason,
        createdAt: ur.createdAt,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─── Installation Requests ────────────────────────────────────────────────────

export const getInstallationRequestsForBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { branchId } = req.user!;
    const repo = Source.getRepository(InstallationRequest);

    const where: FindOptionsWhere<InstallationRequest> = { branchId };

    // NOTE: this used to narrow the list to `where.technicianId = userId` when
    // `role === 'TECHNICIAN'`. TECHNICIAN is not, and never was, an EmployeeRole
    // (ADMIN | HR | MANAGER | EMPLOYEE | FINANCE), so that branch never ran and every
    // employee has always seen the whole branch's requests. Dropped rather than
    // re-pointed at employeeJob, which would silently change who sees what.

    const requests = await repo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    // Enrich with current product allocation
    const invoiceIds = requests.map((r) => r.invoiceId).filter(Boolean);
    let allocations: {
      contractId: string;
      productId: string | null;
      serialNumber: string;
      modelId: string | null;
    }[] = [];
    if (invoiceIds.length > 0) {
      allocations = await Source.query(
        `SELECT "contractId", "productId", "serialNumber", "modelId"
         FROM product_allocations
         WHERE "contractId" = ANY($1::uuid[]) AND status = 'ALLOCATED'
         ORDER BY "startTimestamp" DESC`,
        [invoiceIds],
      );
    }
    const allocationMap = new Map<
      string,
      { productId: string | null; serialNumber: string; modelId: string | null }
    >();
    for (const a of allocations) {
      if (!allocationMap.has(a.contractId)) {
        allocationMap.set(a.contractId, {
          productId: a.productId,
          serialNumber: a.serialNumber,
          modelId: a.modelId,
        });
      }
    }

    // Enrich with security deposit status — powers the Technician's "Collect Security
    // Deposit" action, which should only ever show when the contract actually requires
    // one and it hasn't already been recorded (by the Employee at conversion, or by
    // anyone else since). Batched the same way as the allocation lookup above.
    const rentLeaseIds = requests
      .filter((r) => r.saleType === 'RENT' || r.saleType === 'LEASE')
      .map((r) => r.invoiceId)
      .filter(Boolean);
    const depositAmountMap = new Map<string, number>();
    const depositCollectedSet = new Set<string>();
    if (rentLeaseIds.length > 0) {
      const [invoices, depositPayments] = await Promise.all([
        Source.getRepository(Invoice).find({
          where: { id: In(rentLeaseIds) },
          select: ['id', 'securityDepositAmount'],
        }),
        Source.getRepository(SalePaymentRequest).find({
          where: {
            invoiceId: In(rentLeaseIds),
            paymentContext: In(['RENT_SECURITY_DEPOSIT', 'LEASE_SECURITY_DEPOSIT']),
            status: In(['PENDING', 'APPROVED']),
          },
        }),
      ]);
      for (const inv of invoices) {
        if (Number(inv.securityDepositAmount) > 0) {
          depositAmountMap.set(inv.id, Number(inv.securityDepositAmount));
        }
      }
      for (const p of depositPayments) {
        depositCollectedSet.add(p.invoiceId);
      }
    }

    const enriched = requests.map((r) => {
      const alloc = allocationMap.get(r.invoiceId);
      const requiredDeposit = depositAmountMap.get(r.invoiceId) ?? 0;
      return {
        ...r,
        currentProductId: alloc?.productId ?? null,
        currentSerialNumber: alloc?.serialNumber ?? null,
        currentModelId: alloc?.modelId ?? null,
        securityDepositAmount: requiredDeposit,
        securityDepositCollected: depositCollectedSet.has(r.invoiceId),
      };
    });
    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

export const createInstallationRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string; // invoiceId
    const { userId, branchId } = req.user!;
    const { customerName, customerAddress, invoiceNumber, notes } = req.body;

    const repo = Source.getRepository(InstallationRequest);

    // Prevent duplicate
    const existing = await repo.findOne({ where: { invoiceId: id } });
    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: 'Installation request already exists',
      });
    }

    const [employeeName, invoice] = await Promise.all([
      fetchEmployeeName(userId),
      Source.getRepository(Invoice).findOne({
        where: { id },
        select: ['id', 'saleType', 'branchId', 'deliveryStatus'],
      }),
    ]);

    if (invoice?.deliveryStatus !== DeliveryStatus.DELIVERED) {
      throw new AppError(
        'Cannot raise an installation request until the machine has been delivered',
        400,
      );
    }

    const request = repo.create({
      invoiceId: id,
      branchId,
      assignedByEmployeeId: userId,
      assignedByEmployeeName: employeeName,
      customerName: customerName || 'Customer',
      customerAddress,
      invoiceNumber: invoiceNumber || '',
      notes,
      saleType: invoice?.saleType || undefined,
      status: 'PENDING',
    });

    await repo.save(request);
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

export const assignTechnician = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // installationRequestId
    const { branchId } = req.user!;
    const { technicianId, technicianName } = req.body;

    const repo = Source.getRepository(InstallationRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Installation request not found', 404);
    if (request.branchId !== branchId) throw new AppError('Access denied', 403);

    const invoice = await Source.getRepository(Invoice).findOne({
      where: { id: request.invoiceId },
      select: ['id', 'deliveryStatus'],
    });
    if (invoice?.deliveryStatus !== DeliveryStatus.DELIVERED) {
      throw new AppError('Cannot assign a technician until the machine has been delivered', 400);
    }

    request.technicianId = technicianId;
    request.technicianName = technicianName;
    request.status = 'ASSIGNED';
    await repo.save(request);

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

export const startInstallation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId } = req.user!;

    const repo = Source.getRepository(InstallationRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Installation request not found', 404);
    if (request.technicianId !== userId) {
      const { role } = req.user!;
      if (!['MANAGER', 'ADMIN', 'FINANCE'].includes(role)) {
        throw new AppError('Only the assigned technician can start installation', 403);
      }
    }
    if (request.startTime) throw new AppError('Installation already started', 400);

    request.startTime = new Date();
    request.status = 'IN_PROGRESS';
    await repo.save(request);

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

export const stopInstallation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId } = req.user!;
    const { bwCount, bwA3Count, colorCount, colorA3Count, readingPhotoUrl, readingTakenDate } =
      req.body ?? {};

    const repo = Source.getRepository(InstallationRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Installation request not found', 404);
    if (!request.startTime) throw new AppError('Installation has not started yet', 400);
    if (request.endTime) throw new AppError('Installation already completed', 400);

    const isRentLease = request.saleType === 'RENT' || request.saleType === 'LEASE';
    const hasReadings = isRentLease && (bwCount != null || colorCount != null);

    if (hasReadings) {
      // Apply initial readings to all InvoiceItems that belong to this invoice
      const itemRepo = Source.getRepository(InvoiceItem);
      const items = await itemRepo.find({ where: { invoice: { id: request.invoiceId } } });
      for (const item of items) {
        if (bwCount != null) item.initialBwCount = Number(bwCount);
        if (bwA3Count != null) item.initialBwA3Count = Number(bwA3Count);
        if (colorCount != null) item.initialColorCount = Number(colorCount);
        if (colorA3Count != null) item.initialColorA3Count = Number(colorA3Count);
      }
      if (items.length > 0) await itemRepo.save(items);

      // ALSO sync ProductAllocation — InvoiceItem.initialBwCount above is display/legacy
      // metadata only. The actual per-period usage calculation (usageService.ts's
      // allocation-based path, which every Rent/Lease contract with allocated machines
      // goes through) reads its starting reading from
      // ProductAllocation.initialBwA4/initialBwA3/initialColorA4/initialColorA3 — a
      // separate row created at machine-allocation time, usually before the technician
      // ever visits site, so it normally still holds Finance's placeholder/zero reading
      // from activation. Writing only to InvoiceItem left the technician's real reading
      // invisible to both the actual bill calculation and the Finance Usage form's
      // preview (which independently falls back to ProductAllocation for the same
      // reason) — this is the fix.
      // Only overwrite an allocation that hasn't been billed yet (current === initial,
      // i.e. no usage period has advanced it) — protects an already-active contract's
      // billing history if this ever ran late.
      const allocRepo = Source.getRepository(ProductAllocation);
      const allocations = await allocRepo.find({
        where: { contractId: request.invoiceId, status: AllocationStatus.ALLOCATED },
      });
      const untouchedAllocations = allocations.filter(
        (a) =>
          a.currentBwA4 === a.initialBwA4 &&
          a.currentBwA3 === a.initialBwA3 &&
          a.currentColorA4 === a.initialColorA4 &&
          a.currentColorA3 === a.initialColorA3,
      );
      for (const alloc of untouchedAllocations) {
        if (bwCount != null) alloc.initialBwA4 = alloc.currentBwA4 = Number(bwCount);
        if (bwA3Count != null) alloc.initialBwA3 = alloc.currentBwA3 = Number(bwA3Count);
        if (colorCount != null) alloc.initialColorA4 = alloc.currentColorA4 = Number(colorCount);
        if (colorA3Count != null)
          alloc.initialColorA3 = alloc.currentColorA3 = Number(colorA3Count);
      }
      if (untouchedAllocations.length > 0) await allocRepo.save(untouchedAllocations);
      if (untouchedAllocations.length < allocations.length) {
        logger.warn(
          'stopInstallation: skipped syncing initial reading onto allocation(s) already advanced by billing',
          {
            invoiceId: request.invoiceId,
            skipped: allocations.length - untouchedAllocations.length,
          },
        );
      }

      // Audit trail on the installation request
      const enteredByName = await fetchEmployeeName(userId);
      request.initialReadingEnteredAt = new Date();
      request.initialReadingEnteredByName = enteredByName;
      if (readingPhotoUrl) request.initialReadingPhotoUrl = readingPhotoUrl;
      if (readingTakenDate) request.initialReadingTakenDate = new Date(readingTakenDate);
    }

    request.endTime = new Date();
    request.durationSeconds = Math.floor(
      (request.endTime.getTime() - request.startTime.getTime()) / 1000,
    );
    request.status = 'COMPLETED';
    await repo.save(request);

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// ─── Sale Payment Requests ────────────────────────────────────────────────────

export const getSalePaymentsForInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const repo = Source.getRepository(SalePaymentRequest);
    const payments = await repo.find({
      where: { invoiceId: id },
      order: { createdAt: 'DESC' },
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

// Attaches the linked Advance Bill's status (informational only — never gates the
// payment's own approval) to each RENT_ADVANCE/LEASE_ADVANCE row, one batched query
// covering every payment passed in rather than one per row.
async function attachAdvanceBillStatus<T extends { invoiceId: string; paymentContext?: string }>(
  payments: T[],
): Promise<Array<T & { advanceBillId?: string; advanceBillStatus?: string }>> {
  const advanceInvoiceIds = payments
    .filter((p) => p.paymentContext === 'RENT_ADVANCE' || p.paymentContext === 'LEASE_ADVANCE')
    .map((p) => p.invoiceId);
  if (advanceInvoiceIds.length === 0) return payments;

  const advanceBills = await Source.getRepository(UsageRecord).find({
    where: { contractId: In(advanceInvoiceIds), billType: 'ADVANCE' },
  });
  const byContractId = new Map(advanceBills.map((b) => [b.contractId, b]));

  return payments.map((p) => {
    if (p.paymentContext !== 'RENT_ADVANCE' && p.paymentContext !== 'LEASE_ADVANCE') return p;
    const bill = byContractId.get(p.invoiceId);
    return { ...p, advanceBillId: bill?.id, advanceBillStatus: bill?.billStatus };
  });
}

export const getPendingSalePayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, role } = req.user!;
    const repo = Source.getRepository(SalePaymentRequest);

    const qb = repo.createQueryBuilder('spr').where('spr.status = :status', { status: 'PENDING' });

    // Finance sees only their own branch; Admin/SuperAdmin see all
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      qb.andWhere('spr."branchId" = :branchId', { branchId });
    }

    const payments = await qb.orderBy('spr."createdAt"', 'DESC').getMany();
    res.json({ success: true, data: await attachAdvanceBillStatus(payments) });
  } catch (err) {
    next(err);
  }
};

export const getAllSalePaymentsForBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { branchId, role } = req.user!;
    const repo = Source.getRepository(SalePaymentRequest);

    const qb = repo.createQueryBuilder('spr');

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
    if (!isAdmin) {
      qb.where('spr."branchId" = :branchId', { branchId });
    } else {
      // Admin sees every branch by default, but must also be able to narrow to one or
      // more via the Accounts branch filter — the same `branchIds` contract the other
      // admin-facing accounts endpoints already use. Without this the Admin Receipts view
      // could only ever show everything, so the branch selector had no effect on it.
      const requested = String(req.query.branchIds ?? '')
        .split(',')
        .map((b) => b.trim())
        .filter((b) => /^[0-9a-f-]{36}$/i.test(b));
      if (requested.length > 0) {
        qb.where('spr."branchId" IN (:...requested)', { requested });
      }
    }

    const payments = await qb.orderBy('spr."createdAt"', 'DESC').getMany();
    res.json({ success: true, data: await attachAdvanceBillStatus(payments) });
  } catch (err) {
    next(err);
  }
};

export const recordSalePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // invoiceId
    const { userId, branchId } = req.user!;
    const {
      amount,
      paymentMode,
      paymentDate,
      referenceNumber,
      remarks,
      cashAccountId,
      chequeNumber,
      chequeBankName,
      chequeDueDate,
      chequeDate,
      collectLater,
      paymentContext,
      isSecurityDeposit,
    } = req.body;

    const request = await createSalePaymentRequest({
      invoiceId: id,
      branchId,
      userId,
      amount: Number(amount),
      paymentMode,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      referenceNumber,
      remarks,
      cashAccountId,
      chequeNumber,
      isSecurityDeposit: !!isSecurityDeposit,
      chequeBankName,
      chequeDueDate: chequeDueDate ? new Date(chequeDueDate) : undefined,
      chequeDate: chequeDate ? new Date(chequeDate) : undefined,
      collectLater,
      paymentContext,
    });

    // Soft, non-blocking heads-up only — never rejects the request. A legitimate
    // multi-period collection or a partial top-up can validly exceed what a single
    // invoice-level snapshot suggests is "remaining" (e.g. collecting two periods'
    // worth at once), so this only surfaces a warning for whoever's recording it to
    // double-check, rather than hard-blocking at creation the way approval does.
    // Wrapped so a failure here can never break request creation itself.
    //
    // A security deposit is never compared here: it's a refundable liability, not part
    // of invoice.totalAmount (the contract's accrued revenue) at all — the same reason
    // it's excluded from every AR/receivable sum elsewhere (accountsShared.ts,
    // lineItemDrilldownController.ts). Comparing a deposit's amount against "remaining
    // balance on the invoice" produced a false-positive overpay warning on essentially
    // every normal deposit collection on a contract whose advance/rent was already paid
    // up (remaining == 0, so ANY deposit amount looked like an overpay). Existing deposit
    // rows are excluded from `committed` too, so they can't produce a false positive on
    // a real advance/periodic request either.
    let overpayWarning: string | undefined;
    if (!request.isSecurityDeposit) {
      try {
        const invoice = await Source.getRepository(Invoice).findOne({ where: { id } });
        if (invoice) {
          const existing = await Source.getRepository(SalePaymentRequest).find({
            where: { invoiceId: id },
          });
          const committed = existing
            .filter(
              (r) =>
                r.id !== request.id &&
                !r.isSecurityDeposit &&
                (r.status === 'APPROVED' || r.status === 'PENDING'),
            )
            .reduce((s, r) => s + Number(r.amount), 0);
          const remaining = Number(invoice.totalAmount || 0) - committed;
          if (Number(request.amount) > remaining + 0.1) {
            overpayWarning =
              `This amount (${request.currency} ${Number(request.amount).toFixed(2)}) is more than the ` +
              `${request.currency} ${Math.max(0, remaining).toFixed(2)} currently remaining on this invoice, ` +
              `after already-approved and other pending requests. Double-check it's correct — it will still ` +
              `need Accounts' approval, and won't post if it turns out to overpay.`;
          }
        }
      } catch {
        // Never let warning computation break request creation.
      }
    }

    res.status(201).json({ success: true, data: request, warning: overpayWarning });
  } catch (err) {
    next(err);
  }
};

export const approveSalePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // salePaymentRequestId
    const { userId, branchId, role } = req.user!;

    if (!['FINANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new AppError('Only Finance can approve payments', 403);
    }

    const repo = Source.getRepository(SalePaymentRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Payment request not found', 404);
    if (request.status !== 'PENDING') {
      throw new AppError(`Cannot approve a ${request.status} payment request`, 400);
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && request.branchId !== branchId) {
      throw new AppError('Access denied', 403);
    }

    // Finance may supply the cash/bank account at approval time (for requests
    // where the employee didn't/couldn't select one at recording time).
    const approvingCashAccountId: string | undefined =
      ((req.body ?? {}).cashAccountId as string | undefined) ?? request.cashAccountId ?? undefined;

    if (['CASH', 'BANK_TRANSFER'].includes(request.paymentMode) && !approvingCashAccountId) {
      throw new AppError('Select a cash or bank account before approving this payment', 400);
    }

    // Fail before touching anything: a Cash-mode collection must land in a real CASH
    // account and Bank Transfer in a real BANK account, belonging to this branch. The
    // account resolution below used to be a bare findOne with no type/branch check at
    // all, so a mismatched account (or one from a different branch) silently accepted
    // the approval and posted the cashbook entry against whatever it found.
    if (['CASH', 'BANK_TRANSFER'].includes(request.paymentMode)) {
      await requireCashAccount(Source, {
        branchId: request.branchId,
        paymentMode: request.paymentMode,
        explicitAccountId: approvingCashAccountId,
      });
    }

    const reviewerName = await fetchEmployeeName(userId);
    const queryRunner = Source.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Mark request as approved
      request.status = 'APPROVED';
      request.reviewedById = userId;
      request.reviewedByName = reviewerName;
      request.reviewedAt = new Date();
      await queryRunner.manager.save(SalePaymentRequest, request);

      // 2. Record the actual PaymentTransaction
      const txn = queryRunner.manager.create(PaymentTransaction, {
        invoiceId: request.invoiceId,
        transactionDate: new Date(request.paymentDate),
        paymentMode: request.paymentMode,
        referenceNumber: request.referenceNumber,
        amount: request.amount,
        recordedBy: userId,
        remarks: request.remarks || `Sale payment approved — ${request.requestNo}`,
        currencyCode: request.currency,
        // Carried through so the receivable queries can drop deposit receipts from
        // "paid" — see PaymentTransaction.isSecurityDeposit. Without it a deposit
        // reduced the customer's outstanding balance despite never being part of it.
        isSecurityDeposit: request.isSecurityDeposit === true,
      });
      const savedTxn = await queryRunner.manager.save(PaymentTransaction, txn);

      // Update the salePaymentRequest with the txn id
      await queryRunner.manager.update(SalePaymentRequest, id, {
        paymentTransactionId: savedTxn.id,
      });

      // 3. Update invoice ledger — with overpayment guard.
      // For Rent/Lease contracts, the ledger may not exist yet if the contract was activated
      // before the ACTIVE_CONTRACT status fix; create it on first approved payment in that case.
      //
      // Always re-sync totalAmount from the live Invoice, even when the ledger already
      // exists: a Rent/Lease invoice's totalAmount keeps growing as each new periodic
      // usage bill accrues (usageService.ts), but the ledger only mirrored it once, on
      // whichever approval first had to auto-create the row. Without re-syncing here,
      // every periodic collection approved after that first one gets compared against a
      // stale, too-low total and false-positives as "overpay" — this is exactly what
      // blocked a legitimate partial periodic collection (525 advance already approved,
      // ledger frozen at 525, invoice had since grown to 4354.35 with a new usage bill).
      const inv = await queryRunner.manager.findOne(Invoice, {
        where: { id: request.invoiceId },
      });
      if (!inv) throw new AppError('Invoice not found for this payment request', 404);

      // A security deposit is never posted to InvoiceLedger — that ledger tracks the
      // contract's accrued revenue receivable (invoice.totalAmount), which a deposit was
      // never part of. Folding it into paidAmount here silently inflated "paid" with
      // money that isn't revenue, and — far worse — on any contract whose advance/rent
      // was already fully paid (paidAmount == totalAmount, the ordinary state of an
      // active contract) it made the overpayment guard below unconditionally reject
      // EVERY deposit approval with "would overpay the invoice", since paidAmount + the
      // deposit always exceeded totalAmount. The deposit itself is still fully tracked —
      // via the SalePaymentRequest row (status/amount) and, once approved, the
      // GuaranteeCheque or cashbook entry below — just never through this ledger.
      if (!request.isSecurityDeposit) {
        let ledger = await queryRunner.manager.findOne(InvoiceLedger, {
          where: { invoiceId: request.invoiceId },
        });
        if (!ledger) {
          ledger = queryRunner.manager.create(InvoiceLedger, {
            invoiceId: request.invoiceId,
            totalAmount: Number(inv.totalAmount),
            paidAmount: 0,
            balanceAmount: Number(inv.totalAmount),
          });
        } else {
          ledger.totalAmount = Number(inv.totalAmount);
        }
        {
          const newPaidAmount = Number(ledger.paidAmount) + Number(request.amount);
          const totalAmount = Number(ledger.totalAmount);
          // Allow a tiny floating-point tolerance (0.1 currency units) but block genuine overpayment
          if (newPaidAmount > totalAmount + 0.1) {
            throw new AppError(
              `Approving this payment would overpay the invoice. ` +
                `Current paid: ${ledger.paidAmount}, This payment: ${request.amount}, ` +
                `Invoice total: ${totalAmount}. Reject this request if it is a duplicate.`,
              400,
            );
          }
          ledger.paidAmount = newPaidAmount;

          ledger.balanceAmount = Math.max(0, totalAmount - newPaidAmount);
          await queryRunner.manager.save(InvoiceLedger, ledger);

          // A direct sale is only PAID once Accounts has actually approved the money.
          // createDirectSale deliberately leaves an employee-collected sale at SENT
          // (outstanding) precisely so this approval is what settles it — without this
          // the sale would sit unpaid on the Sale list forever, even fully collected.
          // Contracts are untouched: a Rent/Lease invoice stays ACTIVE_CONTRACT for its
          // whole life and is never "paid off" by a single period's collection.
          const DIRECT_SALE_TYPES = ['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'];
          if (
            DIRECT_SALE_TYPES.includes(String(inv.saleType)) &&
            inv.status !== InvoiceStatus.PAID &&
            newPaidAmount >= totalAmount - 0.01
          ) {
            inv.status = InvoiceStatus.PAID;
            await queryRunner.manager.save(Invoice, inv);
          }
        }
      }

      // 4. Post cashbook entry for Cash/Bank; create Cheque entity for CHEQUE mode
      if (request.paymentMode === 'CHEQUE' && request.isSecurityDeposit) {
        // Security deposit cheques are a guarantee, not a payment — they never move
        // Cash at Bank, and their lifecycle is Received -> Deposited (bank confirms) or
        // Returned (refunded to the customer), not Deposited -> Cleared like a normal
        // cheque. Route to the dedicated GuaranteeCheque entity/section instead of the
        // regular Cheque table this branch used to fall into unconditionally — that had
        // filed every deposit cheque in the ordinary cheque register, invisible from the
        // Guarantee Cheques page Finance actually manages them from.
        try {
          if (!inv.customerId) {
            throw new Error('Invoice has no customerId — cannot create GuaranteeCheque');
          }
          const gcRepo = Source.getRepository(GuaranteeCheque);
          const existing = await gcRepo.findOne({
            where: { chequeNumber: request.chequeNumber!, branchId: request.branchId },
          });
          if (!existing) {
            const gc = queryRunner.manager.create(GuaranteeCheque, {
              customerId: inv.customerId,
              customerName: request.customerName,
              contractInvoiceId: request.invoiceId,
              contractReference: request.invoiceNumber,
              chequeNumber: request.chequeNumber!,
              amount: Number(request.amount),
              currencyCode: request.currency,
              bankName: request.chequeBankName || 'N/A',
              receivedDate: new Date(request.paymentDate),
              purpose: GuaranteeChequePurpose.PERFORMANCE_SECURITY,
              status: GuaranteeChequeStatus.RECEIVED,
              branchId: request.branchId,
              createdBy: userId,
              notes: `Security deposit — ${request.invoiceNumber} (${request.customerName})`,
            });
            await queryRunner.manager.save(GuaranteeCheque, gc);
          }
        } catch (gcErr) {
          logger.warn(
            'Failed to create guarantee cheque entity for security deposit payment:',
            gcErr,
          );
        }
      } else if (request.paymentMode === 'CHEQUE') {
        // CHEQUE: create a received-cheque entity so it enters the deposit/clear lifecycle
        try {
          const chequeRepo = Source.getRepository(Cheque);
          const existing = await chequeRepo.findOne({
            where: { chequeNo: request.chequeNumber!, branchId: request.branchId },
          });
          if (!existing) {
            // RENT_PERIODIC / LEASE_PERIODIC contexts settle a rent or lease contract,
            // not a sale.
            const ctx = (request.paymentContext ?? '').toUpperCase();
            const chequeSourceType = ctx.startsWith('RENT')
              ? 'RENT'
              : ctx.startsWith('LEASE')
                ? 'LEASE'
                : 'SALE';
            const chequeContextLabel =
              chequeSourceType === 'SALE' ? 'Sale' : chequeSourceType === 'RENT' ? 'Rent' : 'Lease';

            const cheque = queryRunner.manager.create(Cheque, {
              chequeNo: request.chequeNumber!,
              bankName: request.chequeBankName || undefined,
              partyName: request.customerName,
              amount: request.amount,
              dueDate: request.chequeDueDate ?? new Date(request.paymentDate),
              // Frontend callers only ever send chequeDueDate today (chequeDate is new) —
              // fall back to it so the deposit/clear eligibility gate and the reminder
              // cron (both keyed on chequeDate) still fire for these cheques.
              chequeDate:
                request.chequeDate ?? request.chequeDueDate ?? new Date(request.paymentDate),
              issueDate: new Date(request.paymentDate),
              // When physically collected from the customer — distinct from chequeDate
              // (the earliest deposit-eligibility date, often later for a post-dated
              // cheque). paymentDate is exactly that: the date Finance/the employee
              // recorded receiving it. Was never set on this, the highest-volume
              // RECEIVED-cheque creation path, leaving every Sale/Rent/Lease cheque's
              // Collected Date blank.
              collectedDate: new Date(request.paymentDate),
              type: 'RECEIVED',
              status: 'PENDING',
              description: `${chequeContextLabel} payment — ${request.invoiceNumber} (${request.customerName})`,
              branchId: request.branchId,
              accountId: request.cashAccountId || undefined,
              // Label the cheque with the contract type it actually settles. This was
              // hardcoded 'SALE', so a rent or lease periodic collection taken by cheque
              // filed itself under Sale — misreporting every metered-contract cheque in
              // the cheque register and in any per-context filtering built on it.
              sourceType: chequeSourceType,
              sourceReferenceId: request.invoiceId,
              sourceLabel: `Invoice ${request.invoiceNumber}`,
              invoiceNo: request.invoiceNumber,
              createdBy: userId,
            });
            await queryRunner.manager.save(Cheque, cheque);
          }
        } catch (chequeErr) {
          logger.warn('Failed to create cheque entity for sale payment:', chequeErr);
        }
      } else if (approvingCashAccountId) {
        // CASH / BANK_TRANSFER: post cashbook entry immediately. Type and branch were
        // already validated above — re-fetch through the queryRunner so the balance
        // update below is part of this same transaction and rolls back with it.
        const account = await queryRunner.manager.findOne(CashBankAccount, {
          where: { id: approvingCashAccountId },
        });
        if (account) {
          const entry = queryRunner.manager.create(CashbookEntry, {
            referenceNo: `CE-${request.requestNo}`,
            date: new Date(request.paymentDate),
            accountId: approvingCashAccountId,
            entryType: 'RECEIPT',
            amount: request.amount,
            category: 'SALE_COLLECTION',
            description: `Sale payment — ${request.invoiceNumber} (${request.customerName})`,
            linkedInvoiceId: request.invoiceId,
            paymentMode: request.paymentMode,
            createdBy: userId,
            branchId: request.branchId,
            sourceType: 'SALE_PAYMENT',
            sourceId: savedTxn.id,
          });
          await queryRunner.manager.save(CashbookEntry, entry);

          account.currentBalance = Number(account.currentBalance) + Number(request.amount);
          await queryRunner.manager.save(CashBankAccount, account);
        }
      }

      await queryRunner.commitTransaction();
      res.json({ success: true, data: { ...request, paymentTransactionId: savedTxn.id } });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  } catch (err) {
    next(err);
  }
};

export const rejectSalePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId, role } = req.user!;
    const { rejectionReason } = req.body;

    if (!['FINANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new AppError('Only Finance can reject payments', 403);
    }

    const repo = Source.getRepository(SalePaymentRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Payment request not found', 404);
    if (request.status !== 'PENDING') {
      throw new AppError(`Cannot reject a ${request.status} payment request`, 400);
    }

    const reviewerName = await fetchEmployeeName(userId);
    request.status = 'REJECTED';
    request.reviewedById = userId;
    request.reviewedByName = reviewerName;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason;
    await repo.save(request);

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// ─── Security Deposit refund (Cash/Bank only) ─────────────────────────────────
// A Cheque-collected deposit is a GuaranteeCheque and is refunded by returning that
// cheque instead (Accounts → Guarantee Cheques → Mark as Returned) — that path already
// reverses any deposited-to-bank balance itself, see guaranteeChequesRoutes.ts's
// /:id/return. This endpoint only ever handles the Cash/Bank case, which previously had
// no refund path at all: an approved deposit's cash sat in the account balance forever
// with no way to record giving it back to the customer.
export const refundSecurityDeposit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId, branchId, role } = req.user!;
    const { accountId, refundDate, remarks } = req.body;

    if (!['FINANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new AppError('Only Finance can refund security deposits', 403);
    }

    const repo = Source.getRepository(SalePaymentRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Payment request not found', 404);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && request.branchId !== branchId) {
      throw new AppError('Access denied', 403);
    }
    if (!request.isSecurityDeposit) {
      throw new AppError('This payment is not a security deposit', 400);
    }
    if (request.status !== 'APPROVED') {
      throw new AppError(
        `Cannot refund a ${request.status} security deposit — it must be Approved (i.e. actually collected) first`,
        400,
      );
    }
    if ((request.paymentMode ?? '').toUpperCase() === 'CHEQUE') {
      throw new AppError(
        'This deposit was collected by cheque — return it from Accounts → Guarantee Cheques instead of refunding it here.',
        400,
      );
    }
    if (request.isRefunded) {
      throw new AppError('This security deposit has already been refunded', 400);
    }
    if (!accountId) {
      throw new AppError('Select a Cash/Bank account to refund the deposit from', 400);
    }

    const refunderName = await fetchEmployeeName(userId);

    // postCashbookEntry validates the account belongs to this branch, matches the
    // required Cash/Bank type, and has enough balance to cover the refund — throws
    // before anything is written if any of that fails. It also moves currentBalance
    // and is idempotent on (sourceType, sourceId), so a retried request can't refund
    // the same deposit's cash twice even if this handler is somehow called again.
    await postCashbookEntry({
      date: refundDate || new Date(),
      entryType: 'PAYMENT',
      amount: Number(request.amount),
      category: 'SECURITY_DEPOSIT_REFUND',
      branchId: request.branchId,
      createdBy: userId,
      paymentMode: request.paymentMode,
      accountId,
      description:
        remarks?.trim() ||
        `Security Deposit refund — ${request.invoiceNumber} (${request.customerName})`,
      linkedInvoiceId: request.invoiceId,
      sourceType: 'SECURITY_DEPOSIT_REFUND',
      sourceId: request.id,
    });

    request.isRefunded = true;
    request.refundedAt = new Date();
    request.refundedById = userId;
    request.refundedByName = refunderName;
    request.refundCashAccountId = accountId;
    await repo.save(request);

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// ─── Sale Contracts list (Customer Contracts page) ────────────────────────────

export const getSaleContracts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, role } = req.user!;
    const { status } = req.query;

    const invoiceRepo = Source.getRepository(Invoice);
    const qb = invoiceRepo
      .createQueryBuilder('i')
      .where(`i."saleType" IN ('SALE', 'PRODUCT_SALE', 'SPAREPART_SALE', 'RENT', 'LEASE')`)
      .andWhere(`i.type IN ('FINAL', 'PROFORMA')`);

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      qb.andWhere('i."branchId" = :branchId', { branchId });
    }

    if (status) {
      qb.andWhere('i.status = :status', { status });
    }

    const contracts = await qb
      .orderBy('i.createdAt', 'DESC')
      .select([
        'i.id',
        'i.invoiceNumber',
        'i.customerId',
        'i.customerName',
        'i.createdBy',
        'i.status',
        'i.contractStatus',
        'i.deliveryStatus',
        'i.saleType',
        'i.totalAmount',
        'i.currencyCode',
        'i.createdAt',
        'i.updatedAt',
      ])
      .getRawMany();

    // Attach contract agreement, installation status, and current product allocation
    const agreementRepo = Source.getRepository(ContractAgreement);
    const installRepo = Source.getRepository(InstallationRequest);

    const invoiceIds = contracts.map((c) => c.i_id);
    let agreements: ContractAgreement[] = [];
    let installs: InstallationRequest[] = [];
    let allocations: {
      contractId: string;
      productId: string | null;
      serialNumber: string;
      modelId: string | null;
    }[] = [];
    if (invoiceIds.length > 0) {
      [agreements, installs, allocations] = await Promise.all([
        agreementRepo
          .createQueryBuilder('ca')
          .where('ca."invoiceId" IN (:...ids)', { ids: invoiceIds })
          .getMany(),
        installRepo
          .createQueryBuilder('ir')
          .where('ir."invoiceId" IN (:...ids)', { ids: invoiceIds })
          .getMany(),
        Source.query(
          `SELECT "contractId", "productId", "serialNumber", "modelId"
           FROM product_allocations
           WHERE "contractId" = ANY($1::uuid[]) AND status = 'ALLOCATED'
           ORDER BY "startTimestamp" DESC`,
          [invoiceIds],
        ),
      ]);
    }

    const agreementMap = new Map(agreements.map((a) => [a.invoiceId, a]));
    const installMap = new Map(installs.map((i) => [i.invoiceId, i]));
    // Keep only the most-recent ALLOCATED row per contract
    const allocationMap = new Map<
      string,
      { productId: string | null; serialNumber: string; modelId: string | null }
    >();
    for (const a of allocations) {
      if (!allocationMap.has(a.contractId)) {
        allocationMap.set(a.contractId, {
          productId: a.productId,
          serialNumber: a.serialNumber,
          modelId: a.modelId,
        });
      }
    }

    // Batch-resolve customer names (for contracts where snapshot is missing)
    const CRM_URL = process.env.CRM_SERVICE_URL ?? 'http://localhost:3005';
    const missingCustomerIds = [
      ...new Set(
        contracts
          .filter((c) => c['i_customerId'] && !c['i_customerName'])
          .map((c) => c['i_customerId'] as string),
      ),
    ];
    const customerNameCache: Record<string, string> = {};
    if (missingCustomerIds.length > 0) {
      await Promise.allSettled(
        missingCustomerIds.map(async (id) => {
          try {
            const token = sign(
              { userId: 'billing_service', role: 'ADMIN' },
              process.env.ACCESS_SECRET as string,
              { expiresIn: '1m' },
            );
            const r = await fetch(`${CRM_URL}/customers/${id}`, {
              headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
            });
            if (r.ok) {
              const data = await r.json();
              const name = data?.data?.name ?? data?.name;
              if (name) customerNameCache[id] = name;
            }
          } catch {
            /* skip */
          }
        }),
      );
    }

    // Batch-resolve created-by employee names
    const uniqueEmployeeIds = [
      ...new Set(contracts.map((c) => c['i_createdBy']).filter(Boolean) as string[]),
    ];
    const employeeNameCache: Record<string, string> = {};
    await Promise.allSettled(
      uniqueEmployeeIds.map(async (id) => {
        employeeNameCache[id] = await fetchEmployeeName(id);
      }),
    );

    const result = contracts.map((c) => {
      const alloc = allocationMap.get(c.i_id);
      const customerId = c['i_customerId'] as string | null;
      const resolvedCustomerName =
        c['i_customerName'] || (customerId ? customerNameCache[customerId] : null) || null;
      const createdById = c['i_createdBy'] as string | null;
      const createdByName = createdById ? (employeeNameCache[createdById] ?? null) : null;
      return {
        id: c.i_id,
        invoiceNumber: c['i_invoiceNumber'],
        customerId,
        customerName: resolvedCustomerName,
        createdByEmployeeId: createdById,
        createdByEmployeeName: createdByName,
        status: c.i_status,
        contractStatus: c['i_contractStatus'],
        deliveryStatus: c['i_deliveryStatus'],
        saleType: c['i_saleType'],
        totalAmount: c['i_totalAmount'],
        currencyCode: c['i_currencyCode'],
        createdAt: c['i_createdAt'],
        agreement: agreementMap.get(c.i_id) || null,
        installation: installMap.get(c.i_id) || null,
        currentProductId: alloc?.productId ?? null,
        currentSerialNumber: alloc?.serialNumber ?? null,
        currentModelId: alloc?.modelId ?? null,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // invoiceId
    const { branchId, role } = req.user!;
    const { deliveryStatus } = req.body as { deliveryStatus?: string };

    if (!Object.values(DeliveryStatus).includes(deliveryStatus as DeliveryStatus)) {
      throw new AppError('Invalid delivery status', 400);
    }

    const repo = Source.getRepository(Invoice);
    const invoice = await repo.findOne({ where: { id } });
    if (!invoice) throw new AppError('Contract not found', 404);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && invoice.branchId !== branchId) {
      throw new AppError('Access denied', 403);
    }

    invoice.deliveryStatus = deliveryStatus as DeliveryStatus;
    await repo.save(invoice);

    res.json({
      success: true,
      data: { id: invoice.id, deliveryStatus: invoice.deliveryStatus },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Pending Usage Payments (Rent/Lease periodic collections not fully collected) ─────

/**
 * One row per billing period (UsageRecord) whose full charge hasn't yet been submitted
 * as collections — covers both a partial collection's shortfall and a period recorded
 * with nothing collected at all. "Given"/"Pending" are computed from non-REJECTED
 * SalePaymentRequests linked to that usageRecordId, independent of whether Accounts has
 * approved them yet — this tracks what still needs chasing from the customer, which is
 * a separate concern from the accounting figures that only move on approval.
 */
export const getPendingUsagePayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, role } = req.user!;

    const invoiceRepo = Source.getRepository(Invoice);
    const invQb = invoiceRepo.createQueryBuilder('i').where(`i."saleType" IN ('RENT', 'LEASE')`);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      invQb.andWhere('i."branchId" = :branchId', { branchId });
    }
    const invoices = await invQb
      .select(['i.id', 'i.invoiceNumber', 'i.customerName', 'i.saleType'])
      .getMany();

    if (invoices.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const invoiceIds = invoices.map((i) => i.id);
    const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

    const usageRecords = await Source.getRepository(UsageRecord)
      .createQueryBuilder('ur')
      .where('ur."contractId" IN (:...ids)', { ids: invoiceIds })
      // Advance Bills never belong in this periodic-shortfall queue — they're settled
      // through the separate RENT_ADVANCE/LEASE_ADVANCE payment flow entirely, so the
      // "given" computation below (which only ever matches a SalePaymentRequest by
      // usageRecordId, never by invoiceId+paymentContext) would otherwise show an
      // already-collected advance as a full outstanding shortfall.
      .andWhere(`ur."billType" = 'USAGE'`)
      .orderBy('ur."billingPeriodEnd"', 'DESC')
      .getMany();

    if (usageRecords.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const usageRecordIds = usageRecords.map((u) => u.id);

    const payments = await Source.getRepository(SalePaymentRequest)
      .createQueryBuilder('spr')
      .where('spr."usageRecordId" IN (:...ids)', { ids: usageRecordIds })
      .getMany();

    const givenByUsageRecord = new Map<string, number>();
    for (const p of payments) {
      if (p.status === 'REJECTED' || !p.usageRecordId) continue;
      givenByUsageRecord.set(
        p.usageRecordId,
        (givenByUsageRecord.get(p.usageRecordId) || 0) + Number(p.amount),
      );
    }

    const result = usageRecords
      // Only bills the customer has actually approved belong in this "top up the
      // shortfall" queue — an unapproved bill isn't collectible yet (see the same
      // gate enforced server-side in collectPendingUsagePayment below).
      .filter((ur) => ur.billStatus === 'CUSTOMER_APPROVED')
      .map((ur) => {
        const invoice = invoiceMap.get(ur.contractId);
        const given = givenByUsageRecord.get(ur.id) || 0;
        const pending = Math.max(0, Number(ur.totalCharge) - given);
        return {
          usageRecordId: ur.id,
          contractId: ur.contractId,
          invoiceNumber: invoice?.invoiceNumber || '',
          customerName: invoice?.customerName || null,
          saleType: invoice?.saleType || null,
          billingPeriodStart: ur.billingPeriodStart,
          billingPeriodEnd: ur.billingPeriodEnd,
          totalCharge: Number(ur.totalCharge),
          amountGiven: given,
          amountPending: pending,
          billStatus: ur.billStatus,
          createdAt: ur.createdAt,
        };
      })
      .filter((row) => row.amountPending > 0.01);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Collects a further amount against a specific period's outstanding shortfall (e.g.
 * later collecting the AED 80 left over from a AED 280 bill / AED 200 partial). Creates
 * its own PENDING SalePaymentRequest, linked to the same usageRecordId, through the same
 * approval gate as every other collection. Capped at the period's remaining pending
 * balance — the same overpayment-guard philosophy already applied when approving a
 * SalePaymentRequest against an invoice's total.
 */
export const collectPendingUsagePayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const usageRecordId = req.params.id as string;
    const { userId, branchId } = req.user!;
    const {
      amount,
      paymentMode,
      paymentDate,
      referenceNumber,
      cashAccountId,
      chequeNumber,
      chequeBankName,
      chequeDueDate,
      chequeDate,
    } = req.body;

    const usageRecord = await Source.getRepository(UsageRecord).findOne({
      where: { id: usageRecordId },
    });
    if (!usageRecord) throw new AppError('Usage record not found', 404);

    const invoice = await Source.getRepository(Invoice).findOne({
      where: { id: usageRecord.contractId },
    });
    if (!invoice) throw new AppError('Contract not found', 404);
    if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);

    // An Advance or Security Deposit Bill is never collected through this path — that
    // money was already collected via the separate RENT_ADVANCE/LEASE_ADVANCE or
    // RENT_SECURITY_DEPOSIT/LEASE_SECURITY_DEPOSIT payment flow. There's no reachable UI
    // button for this today (both queues that feed this endpoint already exclude these
    // rows), but guard it directly too rather than relying only on that.
    if (usageRecord.billType === 'ADVANCE' || usageRecord.billType === 'SECURITY_DEPOSIT') {
      throw new AppError(
        'Advance and Security Deposit Bills are not collected this way — that payment is handled separately',
        400,
      );
    }

    // Hard block: no collection may be recorded against a bill the customer hasn't
    // approved yet. This is the single choke point for Stage B, so gating it here
    // covers every caller (Pending Payments tab, the Receivable page's "Add Collect
    // Amount", or any future one) — no need to duplicate the check elsewhere.
    if (usageRecord.billStatus !== 'CUSTOMER_APPROVED') {
      throw new AppError('This bill has not been approved by the customer yet', 400);
    }

    const existing = await Source.getRepository(SalePaymentRequest).find({
      where: { usageRecordId },
    });
    const alreadyGiven = existing
      .filter((p) => p.status !== 'REJECTED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingPending = Number(usageRecord.totalCharge) - alreadyGiven;

    const requestedAmount = Number(amount);
    if (!requestedAmount || requestedAmount <= 0) {
      throw new AppError('amount is required', 400);
    }
    if (requestedAmount > remainingPending + 0.01) {
      throw new AppError(
        `Amount (${requestedAmount}) exceeds the remaining pending balance ` +
          `(${remainingPending}) for this period`,
        400,
      );
    }

    const periodLabel = `${new Date(usageRecord.billingPeriodStart).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} to ${new Date(usageRecord.billingPeriodEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;

    const request = await createSalePaymentRequest({
      invoiceId: invoice.id,
      branchId,
      userId,
      amount: requestedAmount,
      paymentMode,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      referenceNumber: chequeNumber || referenceNumber,
      remarks: `Usage bill pending top-up — ${periodLabel}`,
      cashAccountId,
      chequeNumber,
      chequeBankName,
      chequeDueDate: chequeDueDate ? new Date(chequeDueDate) : undefined,
      chequeDate: chequeDate ? new Date(chequeDate) : undefined,
      paymentContext: invoice.saleType === 'RENT' ? 'RENT_PERIODIC' : 'LEASE_PERIODIC',
      usageRecordId,
    });

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// ─── Receipt Generation ───────────────────────────────────────────────────────

export const generateSalePaymentReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string; // salePaymentRequestId
    const { branchId, role } = req.user!;

    const repo = Source.getRepository(SalePaymentRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Payment request not found', 404);
    // The employee physically took the money, so the customer gets their receipt at
    // that moment — Accounts approval is an internal accounting step and must not
    // hold up proof of payment. Issuing the receipt still moves nothing: cash only
    // reaches the books when the request is approved. A REJECTED request is the one
    // case where no money is being held, so no receipt may be issued for it.
    if (request.status === 'REJECTED') {
      throw new AppError('Cannot generate a receipt for a rejected payment', 400);
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && request.branchId !== branchId) {
      throw new AppError('Access denied', 403);
    }

    // Return existing receipt URL if already generated
    if (request.receiptUrl) {
      // Stored value is an object key (or a legacy URL) — hand out a signed link.
      return res.json({
        success: true,
        data: { receiptUrl: (await r2SignedGetUrl(request.receiptUrl)) ?? request.receiptUrl },
      });
    }

    // Generate PDF receipt with pdfkit
    const { default: PDFDocument } = await import('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A5' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(request.requestNo, { align: 'center' });
      doc.moveDown(1);
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor('#cccccc')
        .stroke();
      doc.moveDown(1);

      // Body
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');

      const row = (label: string, value: string) => {
        doc.font('Helvetica-Bold').text(label, 50, doc.y, { continued: true, width: 160 });
        doc.font('Helvetica').text(value);
        doc.moveDown(0.4);
      };

      row('Received from:', request.customerName);
      row('Invoice No.:', request.invoiceNumber);
      row(
        'Amount:',
        `${request.currency} ${Number(request.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      );
      row('Payment Mode:', request.paymentMode.replace('_', ' '));
      row(
        'Payment Date:',
        new Date(request.paymentDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      );

      // Mode-specific details
      if (request.paymentMode === 'CHEQUE' && request.chequeNumber) {
        row('Cheque No.:', request.chequeNumber);
        if (request.chequeBankName) row('Bank:', request.chequeBankName);
        if (request.chequeDate)
          row('Cheque Date:', new Date(request.chequeDate).toLocaleDateString('en-GB'));
        if (request.chequeDueDate)
          row('Due Date:', new Date(request.chequeDueDate).toLocaleDateString('en-GB'));
      } else if (request.referenceNumber) {
        row('Reference No.:', request.referenceNumber);
      }

      if (request.paymentContext) row('Payment Type:', request.paymentContext.replace(/_/g, ' '));
      if (request.remarks) row('Remarks:', request.remarks);
      row('Approved by:', request.reviewedByName || 'Finance');
      row(
        'Approved on:',
        request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString('en-GB') : '—',
      );

      doc.moveDown(1.5);
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor('#cccccc')
        .stroke();
      doc.moveDown(1);
      doc
        .fontSize(8)
        .fillColor('#888888')
        .text('This is a system-generated receipt.', { align: 'center' });

      doc.end();
    });

    // Upload to R2
    const key = `sale-receipts/${request.requestNo}-${Date.now()}.pdf`;
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ACL: 'public-read',
      }),
    );

    // Receipts are private — store the key; readers get a signed URL.
    const receiptUrl = key;

    // Persist URL on the payment record
    request.receiptUrl = receiptUrl;
    await repo.save(request);

    res.json({ success: true, data: { receiptUrl: await r2SignedGetUrl(receiptUrl) } });
  } catch (err) {
    next(err);
  }
};

// ─── Receipt Notifications ────────────────────────────────────────────────────

/** SigV4 caps signed links at 7 days; customer-facing receipts use the max. */
const CUSTOMER_LINK_TTL = 60 * 60 * 24 * 7;

async function ensureReceiptUrl(request: SalePaymentRequest): Promise<string> {
  if (request.receiptUrl)
    return (await r2SignedGetUrl(request.receiptUrl, CUSTOMER_LINK_TTL)) ?? request.receiptUrl;

  const { default: PDFDocument } = await import('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A5' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(request.requestNo, { align: 'center' });
    doc.moveDown(1);
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(1);
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');

    const row = (label: string, value: string) => {
      doc.font('Helvetica-Bold').text(label, 50, doc.y, { continued: true, width: 160 });
      doc.font('Helvetica').text(value);
      doc.moveDown(0.4);
    };

    row('Received from:', request.customerName);
    row('Invoice No.:', request.invoiceNumber);
    row(
      'Amount:',
      `${request.currency} ${Number(request.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    );
    row('Payment Mode:', request.paymentMode.replace('_', ' '));
    row(
      'Payment Date:',
      new Date(request.paymentDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    );

    if (request.paymentMode === 'CHEQUE' && request.chequeNumber) {
      row('Cheque No.:', request.chequeNumber);
      if (request.chequeBankName) row('Bank:', request.chequeBankName);
    } else if (request.referenceNumber) {
      row('Reference No.:', request.referenceNumber);
    }

    if (request.paymentContext) row('Payment Type:', request.paymentContext.replace(/_/g, ' '));
    row('Approved by:', request.reviewedByName || 'Finance');

    doc.moveDown(1.5);
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(1);
    doc
      .fontSize(8)
      .fillColor('#888888')
      .text('This is a system-generated receipt.', { align: 'center' });
    doc.end();
  });

  const key = `sale-receipts/${request.requestNo}-${Date.now()}.pdf`;
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ACL: 'public-read',
    }),
  );

  const receiptUrl = key;
  const repo = Source.getRepository(SalePaymentRequest);
  request.receiptUrl = receiptUrl;
  await repo.save(request);
  return (await r2SignedGetUrl(receiptUrl, CUSTOMER_LINK_TTL)) ?? receiptUrl;
}

async function fetchCustomerContact(
  customerId: string | null | undefined,
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

export const sendSalePaymentReceiptEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { branchId, role } = req.user!;
    const { recipient: recipientOverride } = (req.body ?? {}) as { recipient?: string };

    const repo = Source.getRepository(SalePaymentRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Payment request not found', 404);
    // Employee sends the receipt at the moment they take the money, same rule as
    // generateSalePaymentReceipt (see the comment there): Accounts approval is an
    // internal accounting step and must not hold up proof of payment. This was still
    // gated to APPROVED only, requiring the customer to wait on Finance before getting
    // an emailed receipt for money they had already handed over. REJECTED is the one
    // case where no money is being held, so sending is refused only there.
    if (request.status === 'REJECTED')
      throw new AppError('Cannot send a receipt for a rejected payment', 400);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && request.branchId !== branchId)
      throw new AppError('Access denied', 403);

    const receiptUrl = await ensureReceiptUrl(request);

    let recipient = recipientOverride?.trim();
    if (!recipient) {
      const inv = await Source.getRepository(Invoice).findOne({
        where: { id: request.invoiceId },
        select: ['customerId'],
      });
      const contact = await fetchCustomerContact(inv?.customerId);
      recipient = contact?.email;
    }
    if (!recipient)
      throw new AppError('Customer email not found. Please provide a recipient email.', 400);

    const paymentDate = new Date(request.paymentDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const amountFormatted = `${request.currency} ${Number(request.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const contextLabel = request.paymentContext
      ? request.paymentContext.replace(/_/g, ' ')
      : 'Payment';
    const modeLabel = request.paymentMode.replace('_', ' ');

    const chequeBlock =
      request.paymentMode === 'CHEQUE' && request.chequeNumber
        ? `<tr><td style="padding:6px 12px;color:#92400e;font-weight:700">Cheque No.</td><td style="padding:6px 12px;font-weight:600">${request.chequeNumber}${request.chequeBankName ? ` — ${request.chequeBankName}` : ''}</td></tr>`
        : '';

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;color:#fff">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;opacity:.75;text-transform:uppercase;letter-spacing:.1em">Payment Receipt</p>
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:900;letter-spacing:-.5px">${request.requestNo}</h1>
    <p style="margin:0;font-size:13px;opacity:.8">${contextLabel}</p>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 20px;font-size:14px;color:#374151">Dear <strong>${request.customerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151">We acknowledge receipt of your payment for invoice <strong>${request.invoiceNumber}</strong>. Details are below.</p>
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;font-size:13px">
      <tr style="background:#f3f4f6"><td style="padding:6px 12px;color:#6b7280;font-weight:700">Amount</td><td style="padding:6px 12px;font-weight:900;font-size:16px;color:#111827">${amountFormatted}</td></tr>
      <tr><td style="padding:6px 12px;color:#6b7280;font-weight:700">Payment Mode</td><td style="padding:6px 12px;font-weight:600">${modeLabel}</td></tr>
      <tr style="background:#f3f4f6"><td style="padding:6px 12px;color:#6b7280;font-weight:700">Payment Date</td><td style="padding:6px 12px;font-weight:600">${paymentDate}</td></tr>
      ${request.referenceNumber && request.paymentMode !== 'CHEQUE' ? `<tr><td style="padding:6px 12px;color:#6b7280;font-weight:700">Reference</td><td style="padding:6px 12px;font-weight:600">${request.referenceNumber}</td></tr>` : ''}
      ${chequeBlock}
      <tr style="background:#f3f4f6"><td style="padding:6px 12px;color:#6b7280;font-weight:700">Payment Type</td><td style="padding:6px 12px;font-weight:600">${contextLabel}</td></tr>
      <tr><td style="padding:6px 12px;color:#6b7280;font-weight:700">Approved by</td><td style="padding:6px 12px;font-weight:600">${request.reviewedByName || 'Finance'}</td></tr>
    </table>
    <div style="margin-top:24px;text-align:center">
      <a href="${receiptUrl}" target="_blank" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:12px 28px;border-radius:8px">Download PDF Receipt</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center">This is a system-generated receipt. Please retain it for your records.</p>
  </div>
</div>`;

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    await NotificationPublisher.publishEmailRequest({
      recipient,
      subject: `Payment Receipt — ${request.requestNo} | Invoice ${request.invoiceNumber}`,
      body: htmlBody,
      invoiceId: request.invoiceId,
      attachmentUrl: receiptUrl,
    });

    logger.info(`[SalePayment] Receipt email queued for ${request.requestNo} → ${recipient}`);
    res.json({ success: true, data: { message: 'Receipt email queued', recipient } });
  } catch (err) {
    next(err);
  }
};

export const sendSalePaymentReceiptWhatsApp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { branchId, role } = req.user!;
    const { recipient: recipientOverride } = (req.body ?? {}) as { recipient?: string };

    const repo = Source.getRepository(SalePaymentRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Payment request not found', 404);
    // Same rule as the email sender above and generateSalePaymentReceipt — Accounts
    // approval must not hold up proof of payment. Only REJECTED (no money held) blocks.
    if (request.status === 'REJECTED')
      throw new AppError('Cannot send a receipt for a rejected payment', 400);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && request.branchId !== branchId)
      throw new AppError('Access denied', 403);

    const receiptUrl = await ensureReceiptUrl(request);

    let recipient = recipientOverride?.trim();
    if (!recipient) {
      const inv = await Source.getRepository(Invoice).findOne({
        where: { id: request.invoiceId },
        select: ['customerId'],
      });
      const contact = await fetchCustomerContact(inv?.customerId);
      recipient = contact?.phone;
    }
    if (!recipient)
      throw new AppError('Customer phone not found. Please provide a recipient number.', 400);

    const amountFormatted = `${request.currency} ${Number(request.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const paymentDate = new Date(request.paymentDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const contextLabel = request.paymentContext
      ? request.paymentContext.replace(/_/g, ' ')
      : 'Payment';

    const body =
      `Dear ${request.customerName},\n\nYour payment receipt is ready.\n\n` +
      `Receipt No: ${request.requestNo}\n` +
      `Invoice: ${request.invoiceNumber}\n` +
      `Amount: ${amountFormatted}\n` +
      `Mode: ${request.paymentMode.replace('_', ' ')}\n` +
      `Date: ${paymentDate}\n` +
      `Type: ${contextLabel}\n` +
      `Approved by: ${request.reviewedByName || 'Finance'}\n\n` +
      `Download your receipt: ${receiptUrl}\n\n` +
      `Thank you for your business.`;

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    await NotificationPublisher.publishWhatsappRequest({
      recipient,
      body,
      invoiceId: request.invoiceId,
    });

    logger.info(`[SalePayment] Receipt WhatsApp queued for ${request.requestNo} → ${recipient}`);
    res.json({ success: true, data: { message: 'Receipt WhatsApp queued', recipient } });
  } catch (err) {
    next(err);
  }
};
