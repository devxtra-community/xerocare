import { Request, Response, NextFunction } from 'express';
import { MulterS3File } from '../types/multer-s3-file';
import { AppError } from '../errors/appError';
import { Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { ReplacementRequest, ReplacementStatus } from '../entities/replacementRequestEntity';
import {
  raiseReplacementRequest,
  decideReplacementRequest,
  selectReplacementUnit,
  markReplacementDelivered,
  assignReplacementTechnician,
  installReplacement,
  issueReplacementSigningToken,
  approveReplacementByCustomer,
  listReplacementRequests,
  getReplacementRequestDetail,
  getAllocationLastReading,
  fetchProductDetail,
  startReplacementWork,
  dispositionReplacementMachine,
} from '../services/replacementRequestService';
import { logger } from '../config/logger';

const FINANCE_ROLES = ['FINANCE', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'];

function fileKeys(req: Request): string[] {
  const files = (req.files as MulterS3File[] | undefined) ?? [];
  return files.map((f) => f.key).filter(Boolean);
}

/** GET /replacements/contract/:contractId/context — everything the request form shows. */
export const getReplacementContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractId = req.params.contractId as string;
    const { branchId, role } = req.user!;

    const invoice = await Source.getRepository(Invoice).findOne({ where: { id: contractId } });
    if (!invoice) throw new AppError('Contract not found', 404);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && invoice.branchId !== branchId) {
      throw new AppError('Access denied', 403);
    }

    // Accessories share the allocation mechanism but are never metered, so they can
    // never be the subject of a replacement — filtered out here rather than in the UI.
    const allocations = await Source.getRepository(ProductAllocation).find({
      where: { contractId, status: AllocationStatus.ALLOCATED },
      order: { startTimestamp: 'ASC' },
    });
    const machines = allocations.filter((a) => a.itemType !== 'ACCESSORY');

    const withProducts = await Promise.all(
      machines.map(async (a) => ({
        allocationId: a.id,
        serialNumber: a.serialNumber,
        productId: a.productId,
        modelId: a.modelId,
        currentBwA4: a.currentBwA4,
        currentBwA3: a.currentBwA3,
        currentColorA4: a.currentColorA4,
        currentColorA3: a.currentColorA3,
        startTimestamp: a.startTimestamp,
        product: await fetchProductDetail(a.productId),
      })),
    );

    const detailSeed = await Source.getRepository(ReplacementRequest).findOne({
      where: { contractId },
      order: { raisedAt: 'DESC' },
    });

    res.json({
      success: true,
      data: {
        contract: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          saleType: invoice.saleType,
          rentPeriod: invoice.rentPeriod,
          effectiveFrom: invoice.effectiveFrom,
          effectiveTo: invoice.effectiveTo,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          contractStatus: invoice.contractStatus,
        },
        machines: withProducts,
        latestRequest: detailSeed ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements — stage 01, employee raises it (multipart: proof photos). */
export const createReplacementRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, branchId } = req.user!;
    const { contractId, allocationId, reason, notes } = req.body as Record<string, string>;

    const request = await raiseReplacementRequest({
      contractId,
      allocationId,
      reason,
      notes,
      proofPhotoUrls: fileKeys(req),
      branchId,
      userId,
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

/** GET /replacements — list, scoped by role. */
export const listReplacements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, role, userId } = req.user!;
    const q = req.query as Record<string, string | undefined>;

    const statuses = q.status ? q.status.split(',') : undefined;
    const rows = await listReplacementRequests({
      branchId: ['ADMIN', 'SUPER_ADMIN'].includes(role) ? undefined : branchId,
      statuses,
      contractId: q.contractId,
      // A technician only ever sees their own jobs.
      technicianId: q.mine === 'true' ? userId : undefined,
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/** GET /replacements/:id — full detail for the view dialogs and the report. */
export const getReplacement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = await getReplacementRequestDetail(req.params.id as string);
    res.json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
};

/** GET /replacements/:id/last-reading — the floor for the technician's closing meter. */
export const getReplacementLastReading = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const request = await Source.getRepository(ReplacementRequest).findOne({
      where: { id: req.params.id as string },
    });
    if (!request) throw new AppError('Replacement request not found', 404);
    const reading = await getAllocationLastReading(request.oldAllocationId);
    res.json({ success: true, data: reading });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/decision — stage 02, Finance approves or rejects. */
export const decideReplacement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    if (!FINANCE_ROLES.includes(role)) {
      throw new AppError('Only Finance can decide a replacement request', 403);
    }
    const { decision, rejectionReason } = req.body as {
      decision?: 'APPROVE' | 'REJECT';
      rejectionReason?: string;
    };
    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      throw new AppError("decision must be 'APPROVE' or 'REJECT'", 400);
    }
    const updated = await decideReplacementRequest(
      req.params.id as string,
      userId,
      decision,
      rejectionReason,
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/select-unit — stage 03. No swap happens here. */
export const selectUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { newProductId, newSerialNumber } = req.body as Record<string, string>;
    const updated = await selectReplacementUnit(
      req.params.id as string,
      userId,
      newProductId,
      newSerialNumber,
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/delivery — stage 04, service desk. */
export const setDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { delivered } = req.body as { delivered?: boolean };
    const updated = await markReplacementDelivered(
      req.params.id as string,
      userId,
      delivered !== false,
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/assign-technician — stage 05, service desk. */
export const assignTechnician = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { technicianId, technicianName } = req.body as Record<string, string>;
    const updated = await assignReplacementTechnician(
      req.params.id as string,
      userId,
      technicianId,
      technicianName,
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/install — stage 06, the swap (multipart: install photos). */
export const install = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const b = req.body as Record<string, string>;
    const num = (v?: string) => (v === undefined || v === '' ? undefined : Number(v));

    const updated = await installReplacement({
      id: req.params.id as string,
      userId,
      oldMeter: {
        bwA4: num(b.oldBwA4),
        bwA3: num(b.oldBwA3),
        colorA4: num(b.oldColorA4),
        colorA3: num(b.oldColorA3),
      },
      newMeter: {
        bwA4: num(b.newBwA4),
        bwA3: num(b.newBwA3),
        colorA4: num(b.newColorA4),
        colorA3: num(b.newColorA3),
      },
      installedOn: b.installedOn,
      installPhotoUrls: fileKeys(req),
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/disposition — Finance audits the returned machine. */
export const dispositionReplacement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    if (!FINANCE_ROLES.includes(role)) {
      throw new AppError('Only Finance can audit a returned machine', 403);
    }
    const { action, note } = req.body as { action?: string; note?: string };
    if (action !== 'STOCK' && action !== 'GWR') {
      throw new AppError("action must be 'STOCK' or 'GWR'", 400);
    }
    const updated = await dispositionReplacementMachine({
      id: req.params.id as string,
      action,
      note,
      userId,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/start-work — technician begins the swap; starts the clock. */
export const startReplacementWorkCtl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await startReplacementWork(req.params.id as string);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/signing-token — 72h single-use customer sign link. */
export const generateSigningToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await issueReplacementSigningToken(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/mark-approved — in-person sign-off. */
export const markCustomerApproved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerName, approvalNote } = req.body as Record<string, string>;
    const updated = await approveReplacementByCustomer(
      req.params.id as string,
      customerName,
      approvalNote,
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** GET /public/replacement/:token — unauthenticated, for the signing page. */
export const getReplacementForSigning = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const repo = Source.getRepository(ReplacementRequest);
    const request = await repo.findOne({ where: { signingToken: token } });
    if (!request) throw new AppError('Invalid or expired replacement link', 404);
    if (request.signingTokenUsed) throw new AppError('This link has already been used', 410);
    if (request.signingTokenExpiresAt && request.signingTokenExpiresAt < new Date()) {
      throw new AppError('This link has expired', 410);
    }
    const detail = await getReplacementRequestDetail(request.id);
    res.json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
};

/** POST /public/replacement/:token/approve — customer signs from their own device. */
export const approveReplacementViaToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.params.token as string;
    const { customerName, approvalNote } = req.body as Record<string, string>;
    const repo = Source.getRepository(ReplacementRequest);
    const request = await repo.findOne({ where: { signingToken: token } });
    if (!request) throw new AppError('Invalid or expired replacement link', 404);
    if (request.signingTokenUsed) throw new AppError('This link has already been used', 410);
    if (request.signingTokenExpiresAt && request.signingTokenExpiresAt < new Date()) {
      throw new AppError('This link has expired', 410);
    }
    const updated = await approveReplacementByCustomer(request.id, customerName, approvalNote);
    res.json({ success: true, data: { status: updated.status } });
  } catch (err) {
    next(err);
  }
};

/** POST /replacements/:id/notify/:channel — send the report by email or WhatsApp. */
export const sendReplacementReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const channel = (req.params.channel as string).toLowerCase();
    if (!['email', 'whatsapp'].includes(channel)) {
      throw new AppError('channel must be email or whatsapp', 400);
    }

    const repo = Source.getRepository(ReplacementRequest);
    const request = await repo.findOne({ where: { id } });
    if (!request) throw new AppError('Replacement request not found', 404);
    if (request.status !== ReplacementStatus.INSTALLED) {
      throw new AppError('The replacement must be installed before the report can be sent', 400);
    }

    const { recipient: override } = (req.body ?? {}) as { recipient?: string };
    const recipient =
      override?.trim() || (channel === 'email' ? request.customerEmail : request.customerPhone);
    if (!recipient) {
      throw new AppError(
        `No customer ${channel === 'email' ? 'email' : 'phone number'} on file. Provide a recipient.`,
        400,
      );
    }

    const { token } = await issueReplacementSigningToken(id);
    const base = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
    const link = `${base}/public/replacement/sign/${token}`;

    const body =
      `Dear ${request.customerName},\n\n` +
      `The machine on contract ${request.contractNumber} has been replaced.\n\n` +
      `Removed: ${request.oldSerialNumber}\nInstalled: ${request.newSerialNumber}\n` +
      `Date: ${request.installedOn}\n\n` +
      `Please review and approve the replacement report: ${link}\n\n` +
      `This link is valid for 72 hours.`;

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    if (channel === 'email') {
      await NotificationPublisher.publishEmailRequest({
        recipient,
        subject: `Machine Replacement Report — ${request.contractNumber}`,
        body,
        invoiceId: request.contractId,
      });
    } else {
      await NotificationPublisher.publishWhatsappRequest({
        recipient,
        body,
        invoiceId: request.contractId,
      });
    }

    request.reportSentAt = new Date();
    request.reportChannel = channel.toUpperCase();
    await repo.save(request);

    logger.info(
      `[Replacement] report for ${request.requestNo} queued via ${channel} → ${recipient}`,
    );
    res.json({ success: true, data: { message: 'Report queued', recipient, link } });
  } catch (err) {
    next(err);
  }
};
