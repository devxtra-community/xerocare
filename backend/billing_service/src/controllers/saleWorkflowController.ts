import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';
import { FindOptionsWhere } from 'typeorm';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { ContractAgreement } from '../entities/contractAgreementEntity';
import { InstallationRequest } from '../entities/installationRequestEntity';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { InvoiceLedger } from '../entities/invoiceLedgerEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { Cheque } from '../entities/chequeEntity';
import { r2 } from '../config/r2';

import { logger } from '../config/logger';

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

async function generateSalePaymentRequestNo(): Promise<string> {
  const repo = Source.getRepository(SalePaymentRequest);
  const year = new Date().getFullYear();
  const count = await repo
    .createQueryBuilder('r')
    .where(`EXTRACT(YEAR FROM r."createdAt") = :year`, { year })
    .getCount();
  const seq = String(count + 1).padStart(4, '0');
  return `SPAY-${year}-${seq}`;
}

// ─── Contract Agreement ───────────────────────────────────────────────────────

export const getContractAgreement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const repo = Source.getRepository(ContractAgreement);

    const agreement = await repo.findOne({ where: { invoiceId: id } });
    res.json({ success: true, data: agreement });
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

    const [agreementNumber, empName] = await Promise.all([
      generateAgreementNumber(),
      fetchEmployeeName(userId),
    ]);

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

    await repo.save(agreement);
    res.status(201).json({ success: true, data: agreement });
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
    res.json({ success: true, data: agreement });
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
    res.json({ success: true, data: agreement });
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

    const R2_BASE_URL =
      process.env.R2_PUBLIC_URL || 'https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev';
    const documentUrl = `${R2_BASE_URL}/${uploadedFile.key}`;

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
    res.json({ success: true, data: agreement });
  } catch (err) {
    next(err);
  }
};

export const generateSigningToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { branchId } = req.user!;

    const repo = Source.getRepository(ContractAgreement);
    const agreement = await repo.findOne({ where: { invoiceId: id } });
    if (!agreement) throw new AppError('Contract agreement not found', 404);
    if (agreement.branchId !== branchId) throw new AppError('Access denied', 403);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    agreement.signingToken = token;
    agreement.signingTokenExpiresAt = expiresAt;
    agreement.signingTokenUsed = false;
    await repo.save(agreement);

    res.json({ success: true, data: { token, expiresAt } });
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

    // Return safe subset — no internal IDs
    res.json({
      success: true,
      data: {
        agreementNumber: agreement.agreementNumber,
        contractDate: agreement.contractDate,
        customerName: agreement.customerName,
        customerAddress: agreement.customerAddress,
        dealerName: agreement.dealerName,
        dealerAddress: agreement.dealerAddress,
        termsAndConditions: agreement.termsAndConditions,
        employeeSignedAt: agreement.employeeSignedAt,
        employeeSignedByName: agreement.employeeSignedByName,
      },
    });
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
    const { branchId, role } = req.user!;
    const repo = Source.getRepository(InstallationRequest);

    const where: FindOptionsWhere<InstallationRequest> = { branchId };

    // Technicians see only their own
    if (role === 'TECHNICIAN') {
      where.technicianId = req.user!.userId;
    }

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
    const enriched = requests.map((r) => {
      const alloc = allocationMap.get(r.invoiceId);
      return {
        ...r,
        currentProductId: alloc?.productId ?? null,
        currentSerialNumber: alloc?.serialNumber ?? null,
        currentModelId: alloc?.modelId ?? null,
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
        select: ['id', 'saleType', 'branchId'],
      }),
    ]);

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
    res.json({ success: true, data: payments });
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

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      qb.where('spr."branchId" = :branchId', { branchId });
    }

    const payments = await qb.orderBy('spr."createdAt"', 'DESC').getMany();
    res.json({ success: true, data: payments });
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
    } = req.body;

    if (!amount || !paymentMode || !paymentDate) {
      throw new AppError('amount, paymentMode, and paymentDate are required', 400);
    }
    if (paymentMode === 'CHEQUE' && !chequeNumber) {
      throw new AppError('chequeNumber is required for CHEQUE payment', 400);
    }

    const invoiceRepo = Source.getRepository(Invoice);
    const invoice = await invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new AppError('Invoice not found', 404);
    if (invoice.branchId !== branchId) throw new AppError('Access denied', 403);

    // Auto-detect paymentContext when not explicitly provided
    let resolvedContext = paymentContext;
    if (!resolvedContext) {
      const saleType = (invoice.saleType || '').toUpperCase();
      if (saleType === 'RENT' || saleType === 'LEASE') {
        const existingCount = await Source.getRepository(SalePaymentRequest).count({
          where: { invoiceId: id },
        });
        if (saleType === 'RENT') {
          resolvedContext = existingCount === 0 ? 'RENT_ADVANCE' : 'RENT_PERIODIC';
        } else {
          resolvedContext = existingCount === 0 ? 'LEASE_ADVANCE' : 'LEASE_PERIODIC';
        }
      } else {
        resolvedContext = 'SALE';
      }
    }

    const [requestNo, employeeName] = await Promise.all([
      generateSalePaymentRequestNo(),
      fetchEmployeeName(userId),
    ]);

    const repo = Source.getRepository(SalePaymentRequest);
    const request = repo.create({
      requestNo,
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      branchId,
      recordedByEmployeeId: userId,
      recordedByEmployeeName: employeeName,
      customerName: invoice.customerName || 'Customer',
      amount: Number(amount),
      currency: invoice.currencyCode || 'AED',
      paymentMode,
      paymentDate: new Date(paymentDate),
      referenceNumber,
      remarks,
      cashAccountId: paymentMode !== 'CHEQUE' ? cashAccountId : undefined,
      chequeNumber,
      chequeBankName,
      chequeDueDate: chequeDueDate ? new Date(chequeDueDate) : undefined,
      chequeDate: chequeDate ? new Date(chequeDate) : undefined,
      collectLater: Boolean(collectLater),
      paymentContext: resolvedContext,
      status: 'PENDING',
    });

    await repo.save(request);
    res.status(201).json({ success: true, data: request });
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
      (req.body.cashAccountId as string | undefined) ?? request.cashAccountId ?? undefined;

    if (['CASH', 'BANK_TRANSFER'].includes(request.paymentMode) && !approvingCashAccountId) {
      throw new AppError('Select a cash or bank account before approving this payment', 400);
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
      });
      const savedTxn = await queryRunner.manager.save(PaymentTransaction, txn);

      // Update the salePaymentRequest with the txn id
      await queryRunner.manager.update(SalePaymentRequest, id, {
        paymentTransactionId: savedTxn.id,
      });

      // 3. Update invoice ledger — with overpayment guard.
      // For Rent/Lease contracts, the ledger may not exist yet if the contract was activated
      // before the ACTIVE_CONTRACT status fix; create it on first approved payment in that case.
      let ledger = await queryRunner.manager.findOne(InvoiceLedger, {
        where: { invoiceId: request.invoiceId },
      });
      if (!ledger) {
        const inv = await queryRunner.manager.findOne(Invoice, {
          where: { id: request.invoiceId },
        });
        if (inv) {
          ledger = queryRunner.manager.create(InvoiceLedger, {
            invoiceId: request.invoiceId,
            totalAmount: Number(inv.totalAmount),
            paidAmount: 0,
            balanceAmount: Number(inv.totalAmount),
          });
        }
      }
      if (ledger) {
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
      }

      // 4. Post cashbook entry for Cash/Bank; create Cheque entity for CHEQUE mode
      if (request.paymentMode === 'CHEQUE') {
        // CHEQUE: create a received-cheque entity so it enters the deposit/clear lifecycle
        try {
          const chequeRepo = Source.getRepository(Cheque);
          const existing = await chequeRepo.findOne({
            where: { chequeNo: request.chequeNumber!, branchId: request.branchId },
          });
          if (!existing) {
            const cheque = queryRunner.manager.create(Cheque, {
              chequeNo: request.chequeNumber!,
              bankName: request.chequeBankName || undefined,
              partyName: request.customerName,
              amount: request.amount,
              dueDate: request.chequeDueDate ?? new Date(request.paymentDate),
              chequeDate: request.chequeDate ?? undefined,
              issueDate: new Date(request.paymentDate),
              type: 'RECEIVED',
              status: 'PENDING',
              description: `Sale payment — ${request.invoiceNumber} (${request.customerName})`,
              branchId: request.branchId,
              accountId: request.cashAccountId || undefined,
              sourceType: 'SALE',
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
        // CASH / BANK_TRANSFER: post cashbook entry immediately
        try {
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
        } catch (cashErr) {
          logger.warn('Failed to post cashbook entry for sale payment:', cashErr);
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
    if (request.status !== 'APPROVED') {
      throw new AppError('Receipt can only be generated for APPROVED payments', 400);
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && request.branchId !== branchId) {
      throw new AppError('Access denied', 403);
    }

    // Return existing receipt URL if already generated
    if (request.receiptUrl) {
      return res.json({ success: true, data: { receiptUrl: request.receiptUrl } });
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

    const R2_BASE_URL =
      process.env.R2_PUBLIC_URL || 'https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev';
    const receiptUrl = `${R2_BASE_URL}/${key}`;

    // Persist URL on the payment record
    request.receiptUrl = receiptUrl;
    await repo.save(request);

    res.json({ success: true, data: { receiptUrl } });
  } catch (err) {
    next(err);
  }
};

// ─── Receipt Notifications ────────────────────────────────────────────────────

async function ensureReceiptUrl(request: SalePaymentRequest): Promise<string> {
  if (request.receiptUrl) return request.receiptUrl;

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

  const receiptUrl = `${process.env.R2_PUBLIC_URL || 'https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev'}/${key}`;
  const repo = Source.getRepository(SalePaymentRequest);
  request.receiptUrl = receiptUrl;
  await repo.save(request);
  return receiptUrl;
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
    const { recipient: recipientOverride } = req.body as { recipient?: string };

    const repo = Source.getRepository(SalePaymentRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Payment request not found', 404);
    if (request.status !== 'APPROVED')
      throw new AppError('Receipt email can only be sent for APPROVED payments', 400);
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
    const { recipient: recipientOverride } = req.body as { recipient?: string };

    const repo = Source.getRepository(SalePaymentRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Payment request not found', 404);
    if (request.status !== 'APPROVED')
      throw new AppError('Receipt can only be sent for APPROVED payments', 400);
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
