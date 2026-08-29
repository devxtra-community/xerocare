import { Request, Response, NextFunction } from 'express';
import { sign } from 'jsonwebtoken';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { MachineSwapRequest, SwapRequestStatus } from '../entities/machineSwapRequestEntity';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { Invoice } from '../entities/invoiceEntity';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { emitProductStatusUpdate } from '../events/publisher/productStatusEvent';
import { logger } from '../config/logger';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeServiceToken() {
  return sign({ userId: 'billing_service', role: 'ADMIN' }, process.env.ACCESS_SECRET as string, {
    expiresIn: '1m',
  });
}

async function fetchProductDetail(productId: string): Promise<{
  serial_no: string;
  product_status: string;
  model_id?: string;
  model?: { model_name?: string };
  customer_id?: string | null;
} | null> {
  const vendorServiceUrl = process.env.VENDOR_SERVICE_URL || 'http://localhost:3003';
  try {
    const res = await fetch(`${vendorServiceUrl}/products/${productId}`, {
      headers: { Authorization: `Bearer ${makeServiceToken()}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

async function fetchManagerId(branchId: string): Promise<string | null> {
  const vendorServiceUrl = process.env.VENDOR_SERVICE_URL || 'http://localhost:3003';
  try {
    const res = await fetch(`${vendorServiceUrl}/branch/${branchId}`, {
      headers: { Authorization: `Bearer ${makeServiceToken()}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.manager_id ?? null;
  } catch {
    return null;
  }
}

// Maps saleType → billType for emitProductStatusUpdate
function toBillType(saleType: string): 'SALE' | 'RENT' | 'LEASE' | 'RETURNED' {
  const t = saleType.toUpperCase();
  if (t === 'RENT') return 'RENT';
  if (t === 'LEASE') return 'LEASE';
  return 'SALE';
}

// ─── Initiate swap (Technician) ───────────────────────────────────────────────

export const initiateMachineSwap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, branchId, role } = req.user!;
    const contractId = req.params.contractId as string;
    const { requestedProductId, reason } = req.body;

    if (!requestedProductId) {
      throw new AppError('requestedProductId is required', 400);
    }

    // Load invoice
    const invoice = await Source.getRepository(Invoice).findOne({ where: { id: contractId } });
    if (!invoice) throw new AppError('Contract not found', 404);
    if (invoice.branchId !== branchId && !['ADMIN', 'MANAGER'].includes(role)) {
      throw new AppError('Forbidden', 403);
    }

    // This technician-request → approval flow ("Flow B") is SALE-only by design.
    // Rent/Lease machine replacement goes exclusively through the Finance/Admin
    // direct-replace flow ("Flow A", see docs/machine-replacement-flow-a.md), which
    // captures the old unit's final meter readings and the new unit's initial
    // readings. This flow captures no readings at all, so letting it touch a metered
    // contract would silently corrupt the next combined bill.
    const swapSaleType = (invoice.saleType ?? '').toUpperCase();
    if (swapSaleType === 'RENT' || swapSaleType === 'LEASE') {
      throw new AppError(
        'Machine replacement for Rent/Lease contracts must be performed by Finance or Admin from the contract screen, which records the meter readings required for billing.',
        400,
      );
    }

    // Find the current active allocation
    const allocationRepo = Source.getRepository(ProductAllocation);
    const currentAllocation = await allocationRepo.findOne({
      where: { contractId, status: AllocationStatus.ALLOCATED },
      order: { startTimestamp: 'DESC' },
    });

    const currentSerialNumber = currentAllocation?.serialNumber ?? 'N/A';
    const currentProductId = currentAllocation?.productId;

    // Fetch replacement product details from vendor service
    const newProduct = await fetchProductDetail(requestedProductId);
    if (!newProduct) throw new AppError('Replacement product not found in inventory', 404);
    if (newProduct.product_status !== 'AVAILABLE') {
      throw new AppError(
        `Replacement unit is not available (status: ${newProduct.product_status})`,
        400,
      );
    }

    // Prevent same unit
    if (currentProductId && requestedProductId === currentProductId) {
      throw new AppError('Cannot swap a machine with itself', 400);
    }

    // Prevent duplicate pending request for same contract
    const existing = await Source.getRepository(MachineSwapRequest).findOne({
      where: { contractId, status: SwapRequestStatus.PENDING },
    });
    if (existing) {
      throw new AppError('A machine swap request is already pending for this contract', 400);
    }

    // Fetch requester's name
    let requestedByName = req.user!.email ?? 'Technician';
    try {
      const empServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
      const eRes = await fetch(`${empServiceUrl}/employees/${userId}`, {
        headers: { Authorization: `Bearer ${makeServiceToken()}` },
      });
      if (eRes.ok) {
        const eJson = await eRes.json();
        const e = eJson?.data;
        if (e) {
          requestedByName =
            [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email || requestedByName;
        }
      }
    } catch {
      // non-fatal
    }

    const swapRepo = Source.getRepository(MachineSwapRequest);
    const swapRequest = swapRepo.create({
      branchId,
      contractId,
      invoiceNumber: invoice.invoiceNumber,
      contractType: invoice.saleType ?? 'SALE',
      customerName: invoice.customerName ?? undefined,
      modelId: currentAllocation?.modelId,
      modelName: newProduct.model?.model_name,
      currentProductId: currentProductId ?? undefined,
      currentSerialNumber,
      requestedProductId,
      requestedSerialNumber: newProduct.serial_no,
      reason,
      requestedById: userId,
      requestedByName,
      status: SwapRequestStatus.PENDING,
    });

    const saved = await swapRepo.save(swapRequest);

    // Notify manager + admins
    const [managerId] = await Promise.all([fetchManagerId(branchId)]);
    const notifPayload = {
      title: 'Machine Swap Request',
      message: `${requestedByName} has requested to swap serial ${currentSerialNumber} → ${newProduct.serial_no} on contract ${invoice.invoiceNumber}.`,
      type: 'INFO' as const,
      referenceId: saved.id,
      referenceType: 'MACHINE_SWAP' as const,
    };

    await Promise.allSettled([
      managerId
        ? NotificationPublisher.publishInAppRequest({ recipientId: managerId, ...notifPayload })
        : Promise.resolve(),
      NotificationPublisher.publishInAppRequest({ notifyAdmins: true, ...notifPayload }),
    ]);

    res
      .status(201)
      .json({ success: true, data: saved, message: 'Swap request submitted for approval' });
  } catch (err) {
    next(err);
  }
};

// ─── List swap requests ───────────────────────────────────────────────────────

export const getMachineSwapRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, role } = req.user!;
    const { status, contractId } = req.query;

    const repo = Source.getRepository(MachineSwapRequest);
    const qb = repo.createQueryBuilder('s');

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      qb.where('s."branchId" = :branchId', { branchId });
    }
    if (status) {
      qb.andWhere('s.status = :status', { status });
    }
    if (contractId) {
      qb.andWhere('s."contractId" = :contractId', { contractId });
    }

    const requests = await qb.orderBy('s."createdAt"', 'DESC').getMany();
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

// ─── Approve swap (Manager / Service Help Desk) ───────────────────────────────

export const approveMachineSwap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, branchId, role } = req.user!;
    const swapId = req.params.id as string;

    const repo = Source.getRepository(MachineSwapRequest);
    const swapRequest = await repo.findOne({ where: { id: swapId } });
    if (!swapRequest) throw new AppError('Swap request not found', 404);
    if (swapRequest.status !== SwapRequestStatus.PENDING) {
      throw new AppError(`Swap request is already ${swapRequest.status}`, 400);
    }
    if (swapRequest.branchId !== branchId && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new AppError('Forbidden', 403);
    }

    // Reviewer name
    let reviewerName = req.user!.email ?? 'Manager';
    try {
      const empServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
      const eRes = await fetch(`${empServiceUrl}/employees/${userId}`, {
        headers: { Authorization: `Bearer ${makeServiceToken()}` },
      });
      if (eRes.ok) {
        const eJson = await eRes.json();
        const e = eJson?.data;
        if (e) {
          reviewerName =
            [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email || reviewerName;
        }
      }
    } catch {
      // non-fatal
    }

    // Verify replacement product is still AVAILABLE
    const newProduct = await fetchProductDetail(swapRequest.requestedProductId);
    if (!newProduct) throw new AppError('Replacement product no longer found in inventory', 404);
    if (newProduct.product_status !== 'AVAILABLE') {
      throw new AppError(
        `Replacement unit is no longer available (status: ${newProduct.product_status}). Please reject and let the technician choose another unit.`,
        400,
      );
    }

    const swapExecutedAt = new Date();
    const allocationRepo = Source.getRepository(ProductAllocation);

    const queryRunner = Source.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Close the old allocation — matched by the specific unit being swapped
      // (currentProductId, which the request already carries) rather than just "most
      // recently allocated on this contract". A contract can have more than one
      // simultaneously ALLOCATED row now that accessories are allocated the same way as
      // the machine itself, so "most recent" could just as easily grab an accessory's
      // allocation instead of the machine actually being swapped.
      const oldAllocation = await allocationRepo.findOne({
        where: swapRequest.currentProductId
          ? {
              contractId: swapRequest.contractId,
              productId: swapRequest.currentProductId,
              status: AllocationStatus.ALLOCATED,
            }
          : { contractId: swapRequest.contractId, status: AllocationStatus.ALLOCATED },
        order: { startTimestamp: 'DESC' },
      });

      if (oldAllocation) {
        oldAllocation.status = AllocationStatus.REPLACED;
        oldAllocation.endTimestamp = swapExecutedAt;
        oldAllocation.replacementReason = swapRequest.reason ?? 'Machine swap';
        await queryRunner.manager.save(ProductAllocation, oldAllocation);
      }

      // Open a new allocation
      const newAllocation = queryRunner.manager.create(ProductAllocation, {
        contractId: swapRequest.contractId,
        modelId: swapRequest.modelId,
        productId: swapRequest.requestedProductId,
        serialNumber: swapRequest.requestedSerialNumber,
        // Carried over — a swap doesn't change whether the unit is a real machine or an
        // accessory. Falls back to PRODUCT (the only kind ever swapped before
        // accessories existed) if no old allocation was found to carry it from.
        itemType: oldAllocation?.itemType ?? 'PRODUCT',
        status: AllocationStatus.ALLOCATED,
        startTimestamp: swapExecutedAt,
        replacementOfAllocationId: oldAllocation?.id,
        replacementReason: swapRequest.reason ?? 'Machine swap',
      });
      await queryRunner.manager.save(ProductAllocation, newAllocation);

      // Update swap request
      swapRequest.status = SwapRequestStatus.APPROVED;
      swapRequest.reviewedById = userId;
      swapRequest.reviewedByName = reviewerName;
      swapRequest.reviewedAt = swapExecutedAt;
      swapRequest.swapExecutedAt = swapExecutedAt;
      await queryRunner.manager.save(MachineSwapRequest, swapRequest);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Emit product status updates via RabbitMQ (non-blocking)
    const contractType = swapRequest.contractType.toUpperCase();
    const billType = toBillType(contractType);

    await Promise.allSettled([
      // Old unit → AVAILABLE (RETURNED)
      swapRequest.currentProductId
        ? emitProductStatusUpdate({
            productId: swapRequest.currentProductId,
            billType: 'RETURNED',
            invoiceId: swapRequest.contractId,
            approvedBy: userId,
            approvedAt: swapExecutedAt,
            branchId,
            customerId: null,
          })
        : Promise.resolve(),
      // New unit → operational status
      emitProductStatusUpdate({
        productId: swapRequest.requestedProductId,
        billType,
        invoiceId: swapRequest.contractId,
        approvedBy: userId,
        approvedAt: swapExecutedAt,
        branchId,
        customerId: newProduct.customer_id ?? null,
      }),
    ]);

    // Notify the technician who requested the swap
    await NotificationPublisher.publishInAppRequest({
      recipientId: swapRequest.requestedById,
      title: 'Machine Swap Approved',
      message: `Your swap request for contract ${swapRequest.invoiceNumber} has been approved. Serial ${swapRequest.currentSerialNumber} → ${swapRequest.requestedSerialNumber} is now active.`,
      type: 'SUCCESS',
      referenceId: swapRequest.id,
      referenceType: 'MACHINE_SWAP',
    }).catch((err) => logger.error('Failed to send swap approval notification', err));

    res.json({ success: true, data: swapRequest, message: 'Machine swap approved and executed' });
  } catch (err) {
    next(err);
  }
};

// ─── Reject swap ──────────────────────────────────────────────────────────────

export const rejectMachineSwap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, branchId, role } = req.user!;
    const swapId = req.params.id as string;
    const { rejectionReason } = req.body;

    const repo = Source.getRepository(MachineSwapRequest);
    const swapRequest = await repo.findOne({ where: { id: swapId } });
    if (!swapRequest) throw new AppError('Swap request not found', 404);
    if (swapRequest.status !== SwapRequestStatus.PENDING) {
      throw new AppError(`Swap request is already ${swapRequest.status}`, 400);
    }
    if (swapRequest.branchId !== branchId && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new AppError('Forbidden', 403);
    }

    let reviewerName = req.user!.email ?? 'Manager';
    try {
      const empServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
      const eRes = await fetch(`${empServiceUrl}/employees/${userId}`, {
        headers: { Authorization: `Bearer ${makeServiceToken()}` },
      });
      if (eRes.ok) {
        const eJson = await eRes.json();
        const e = eJson?.data;
        if (e) {
          reviewerName =
            [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email || reviewerName;
        }
      }
    } catch {
      // non-fatal
    }

    swapRequest.status = SwapRequestStatus.REJECTED;
    swapRequest.reviewedById = userId;
    swapRequest.reviewedByName = reviewerName;
    swapRequest.reviewedAt = new Date();
    swapRequest.rejectionReason = rejectionReason;
    await repo.save(swapRequest);

    await NotificationPublisher.publishInAppRequest({
      recipientId: swapRequest.requestedById,
      title: 'Machine Swap Rejected',
      message: `Your swap request for contract ${swapRequest.invoiceNumber} was rejected by ${reviewerName}${rejectionReason ? `: ${rejectionReason}` : '.'}`,
      type: 'WARNING',
      referenceId: swapRequest.id,
      referenceType: 'MACHINE_SWAP',
    }).catch((err) => logger.error('Failed to send swap rejection notification', err));

    res.json({ success: true, data: swapRequest, message: 'Swap request rejected' });
  } catch (err) {
    next(err);
  }
};
