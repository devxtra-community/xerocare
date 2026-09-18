import { Request, Response, NextFunction } from 'express';
import { EntityManager } from 'typeorm';
import { Source } from '../config/dataSource';
import { CreditNote } from '../entities/creditNoteEntity';
import { CreditNoteStatus } from '../entities/enums/creditNoteStatus';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { emitProductStatusUpdate } from '../events/publisher/productStatusEvent';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { ReturnCreditRepository } from '../repositories/returnCreditRepository';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { CreditNoteType } from '../entities/enums/creditNoteType';
import { ManualPayable } from '../entities/manualPayableEntity';
import { ManualReceivable } from '../entities/manualReceivableEntity';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import {
  PaymentDirection,
  SettlementApprovalStatus,
  SETTLEMENT_TYPES,
} from '../entities/settlementApproval';
import { computeExchangeSettlement, computeRefundSettlement } from '../utils/creditNoteSettlement';

export class CreditNoteController {
  private repository = Source.getRepository(CreditNote);
  private returnCreditRepo = new ReturnCreditRepository();

  /**
   * Has this invoice now been returned in full?
   *
   * An invoice may only be stamped REFUNDED when every refundable line has come back.
   * Two different units of measure are in play, so each category is measured on its own
   * terms and the invoice is only fully covered when BOTH are:
   *
   *  - SPARE_PART lines are quantity-based: 2 of 5 returned leaves 3 validly sold.
   *  - PRODUCT lines are serialized: one credit note per machine, so the measure is how
   *    many of the invoice's machines have been returned.
   *
   * Counting only the category of the credit note in hand would let a 3-machine invoice
   * be closed by returning one machine — which is exactly the bug this replaces.
   */
  private async isFullyReturned(manager: EntityManager, creditNote: CreditNote): Promise<boolean> {
    const allItems = await manager.find(InvoiceItem, {
      where: { invoice: { id: creditNote.invoiceId } },
    });
    if (allItems.length === 0) return true; // no line-item data to compare against — don't block the refund

    // Every completed DIRECT_REFUND against this invoice, including the one being
    // approved right now (which is not yet persisted as COMPLETED).
    const priorReturns = await manager.find(CreditNote, {
      where: {
        invoiceId: creditNote.invoiceId,
        type: CreditNoteType.DIRECT_REFUND,
        status: CreditNoteStatus.COMPLETED,
      },
    });
    const returns = [...priorReturns.filter((cn) => cn.id !== creditNote.id), creditNote];

    // ── Serialized products: count distinct machines sold vs returned ──
    const soldProductIds = new Set(
      allItems.filter((i) => i.productId).map((i) => String(i.productId)),
    );
    const returnedProductIds = new Set(
      returns
        .filter((cn) => cn.itemCategory === 'PRODUCT' && cn.productId)
        .map((cn) => String(cn.productId)),
    );
    const productsCovered = [...soldProductIds].every((id) => returnedProductIds.has(id));

    // ── Spare parts: compare quantities per spare part ──
    const soldQtyByPart = new Map<string, number>();
    for (const i of allItems) {
      if (!i.sparePartId) continue;
      const key = String(i.sparePartId);
      soldQtyByPart.set(key, (soldQtyByPart.get(key) ?? 0) + (i.quantity ?? 0));
    }
    const returnedQtyByPart = new Map<string, number>();
    for (const cn of returns) {
      if (cn.itemCategory !== 'SPARE_PART' || !cn.sparePartId) continue;
      const key = String(cn.sparePartId);
      returnedQtyByPart.set(key, (returnedQtyByPart.get(key) ?? 0) + (cn.quantity ?? 1));
    }
    const partsCovered = [...soldQtyByPart.entries()].every(
      ([partId, soldQty]) => soldQty <= 0 || (returnedQtyByPart.get(partId) ?? 0) >= soldQty,
    );

    return productsCovered && partsCovered;
  }

  // ── Shared helper: call inventory service with admin JWT ──────────────────
  private async callInventoryService(path: string, body: object): Promise<void> {
    try {
      const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '5m' },
      );
      const response = await fetch(`${inventoryServiceUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        logger.error(`Inventory service call failed: ${path}`, errData);
        // Non-fatal: the credit note flow continues even if inventory update fails
      }
    } catch (err) {
      logger.error(`Failed to reach inventory service at ${path}`, err);
    }
  }

  // ── Resolve the operating currency for a branch from its cash/bank accounts.
  // Falls back to 'QAR' when no account exists yet, rather than silently
  // hardcoding the wrong region's currency.
  private async getBranchCurrency(branchId: string, manager?: EntityManager): Promise<string> {
    const repo = manager
      ? manager.getRepository(CashBankAccount)
      : Source.getRepository(CashBankAccount);
    const account = await repo.findOne({ where: { branchId } });
    return account?.currency ?? 'QAR';
  }

  // ── B.10: Atomic credit note number via PostgreSQL per-year sequence ──────
  private async generateCreditNoteNo(): Promise<string> {
    const year = new Date().getFullYear();
    // Seed start from current count so existing data is never overwritten
    const count = await this.repository
      .createQueryBuilder('cn')
      .where('cn.creditNoteNo LIKE :pat', { pat: `CN-${year}-%` })
      .getCount();
    await Source.query(
      `CREATE SEQUENCE IF NOT EXISTS cn_seq_${year} START WITH ${count + 1} INCREMENT BY 1`,
    );
    const result = await Source.query(`SELECT nextval('cn_seq_${year}') AS n`);
    const sequence = String(result[0].n).padStart(5, '0');
    return `CN-${year}-${sequence}`;
  }

  /**
   * Create a new Credit Note in DRAFT status.
   * Supports both PRODUCT and SPARE_PART item categories.
   * Auto-copies tax fields from the originating invoice (B.2).
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        invoiceId,
        invoiceNumber,
        customerId,
        customerName,
        branchId,
        itemCategory = 'PRODUCT',
        // PRODUCT fields
        productId,
        productName,
        modelName,
        brand,
        serialNumber,
        // SPARE_PART fields
        sparePartId,
        sku,
        quantity,
        // Shared
        productAmount,
        type,
        notes,
        sellerEmployeeId,
      } = req.body;

      if (!invoiceId || !invoiceNumber || !customerId || !customerName || !type) {
        throw new AppError('Missing required fields', 400);
      }
      if (itemCategory === 'PRODUCT' && !productId) {
        throw new AppError('productId is required for PRODUCT returns', 400);
      }
      if (itemCategory === 'SPARE_PART' && !sparePartId) {
        throw new AppError('sparePartId is required for SPARE_PART returns', 400);
      }

      // Copy tax rate from originating invoice (B.2)
      let taxName: string | undefined;
      let taxPercent: number | undefined;
      let taxAmount: number | undefined;
      try {
        const invoice = await Source.getRepository(Invoice).findOne({ where: { id: invoiceId } });
        if (invoice?.taxPercent) {
          taxName = invoice.taxName ?? undefined;
          taxPercent = Number(invoice.taxPercent);
          taxAmount = (Number(productAmount) * taxPercent) / 100;
        }
      } catch (err) {
        logger.warn('Could not fetch invoice tax for credit note', err);
      }

      const creditNoteNo = await this.generateCreditNoteNo();

      const creditNote = this.repository.create({
        creditNoteNo,
        invoiceId,
        invoiceNumber,
        customerId,
        customerName,
        branchId: branchId || req.user?.branchId,
        itemCategory,
        // PRODUCT
        productId: itemCategory === 'PRODUCT' ? productId : undefined,
        productName: productName || undefined,
        modelName: modelName || undefined,
        brand: brand || undefined,
        serialNumber: serialNumber || undefined,
        // SPARE_PART
        sparePartId: itemCategory === 'SPARE_PART' ? sparePartId : undefined,
        sku: sku || undefined,
        quantity: itemCategory === 'SPARE_PART' ? quantity || 1 : undefined,
        // Financial
        productAmount,
        taxName,
        taxPercent,
        taxAmount,
        type,
        notes,
        sellerEmployeeId: sellerEmployeeId || req.user?.userId,
        status: CreditNoteStatus.DRAFT,
      });

      await this.repository.save(creditNote);
      logger.info(`Credit Note created: ${creditNoteNo}`);

      return res.status(201).json({
        success: true,
        data: creditNote,
        message: 'Credit Note created as Draft',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List credit notes with role-based filtering.
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, userId, branchId } = req.user!;
      let query = this.repository.createQueryBuilder('cn');

      if (role === 'FINANCE') {
        query = query.where('cn.status != :draft', { draft: CreditNoteStatus.DRAFT });
      } else {
        if (role === 'EMPLOYEE') {
          query = query.where('cn.sellerEmployeeId = :userId', { userId });
        } else if (role === 'MANAGER') {
          query = query.where('cn.branchId = :branchId', { branchId });
        }
      }

      const list = await query.orderBy('cn.createdAt', 'DESC').getMany();

      return res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a Draft Credit Note.
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const creditNote = await this.repository.findOne({ where: { id: id as string } });

      if (!creditNote) throw new AppError('Credit Note not found', 404);
      if (creditNote.status !== CreditNoteStatus.DRAFT) {
        throw new AppError('Only Draft credit notes can be edited', 400);
      }

      this.repository.merge(creditNote, req.body);
      await this.repository.save(creditNote);

      return res.status(200).json({
        success: true,
        data: creditNote,
        message: 'Credit Note updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a Draft Credit Note.
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const creditNote = await this.repository.findOne({ where: { id: id as string } });

      if (!creditNote) throw new AppError('Credit Note not found', 404);
      if (creditNote.status !== CreditNoteStatus.DRAFT) {
        throw new AppError('Only Draft credit notes can be deleted', 400);
      }

      await this.repository.remove(creditNote);

      return res.status(200).json({ success: true, message: 'Credit Note deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send Credit Note to Finance for review.
   */
  sendToFinance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const creditNote = await this.repository.findOne({ where: { id: id as string } });

      if (!creditNote) throw new AppError('Credit Note not found', 404);
      if (creditNote.status !== CreditNoteStatus.DRAFT) {
        throw new AppError('Only Draft credit notes can be sent', 400);
      }

      creditNote.status = CreditNoteStatus.PENDING_APPROVAL;
      await this.repository.save(creditNote);

      return res.status(200).json({
        success: true,
        data: creditNote,
        message: 'Credit Note sent for Finance Approval',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Finance Approval.
   * For DIRECT_REFUND: immediately completes — creates ReturnCredit, updates inventory, closes invoice.
   * For REPLACEMENT / CREDIT_EXCHANGE: moves to APPROVED; inventory updated when Sales calls complete().
   *
   * All DATABASE writes (credit note, ReturnCredit, invoice status) happen inside a single
   * transaction so they commit or roll back together — previously the credit note's own save
   * was the LAST step, after those other writes had already committed, so a failure there
   * (e.g. an invalid damageReason value) left a permanently orphaned credit note stuck at
   * PENDING_APPROVAL with an invoice already marked REFUNDED and a ReturnCredit already on
   * the books. External side effects (RabbitMQ product-status event, inventory REST call)
   * are not part of the DB transaction — they fire only after it commits, and are treated as
   * best-effort/non-fatal (consistent with callInventoryService's existing error handling),
   * so a downstream outage there can't roll back a refund the DB has already correctly recorded.
   */
  approve = async (req: Request, res: Response, next: NextFunction) => {
    const queryRunner = Source.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { id } = req.params;
      const { financeNote, damageReason, paymentMode } = req.body; // B.1: paymentMode now persisted

      if (!financeNote || !damageReason) {
        throw new AppError('Finance note and damage reason are required', 400);
      }

      const creditNote = await queryRunner.manager.findOne(CreditNote, {
        where: { id: id as string },
      });
      if (!creditNote) throw new AppError('Credit Note not found', 404);
      if (creditNote.status !== CreditNoteStatus.PENDING_APPROVAL) {
        throw new AppError('Invalid status for approval', 400);
      }

      creditNote.financeNote = financeNote;
      creditNote.damageReason = damageReason;
      creditNote.paymentMode = paymentMode || undefined; // B.1

      // Which returns are scrapped vs put back on the shelf. Reasons that describe a
      // faulty or incomplete unit are written off; a unit returned merely because it was
      // the wrong item is still perfectly sellable and goes back to stock. Previously only
      // 'Damaged Product' scrapped, so genuinely defective units were treated as resaleable.
      const SCRAP_REASONS = ['Damaged Product', 'Defective', 'Incomplete Parts'];
      const inventoryStatus: 'DAMAGED' | 'RETURNED' = SCRAP_REASONS.includes(damageReason)
        ? 'DAMAGED'
        : 'RETURNED';
      let postCommitInventorySideEffect: (() => Promise<void>) | null = null;

      if (creditNote.type === 'DIRECT_REFUND') {
        creditNote.status = CreditNoteStatus.COMPLETED;

        if (creditNote.itemCategory === 'PRODUCT') {
          // Mark product unit as DAMAGED or RETURNED via RabbitMQ (B.7: branchId now passed)
          postCommitInventorySideEffect = () =>
            emitProductStatusUpdate({
              productId: creditNote.productId!,
              billType: inventoryStatus,
              invoiceId: creditNote.invoiceId,
              approvedBy: req.user?.userId || 'FINANCE',
              approvedAt: new Date(),
              branchId: creditNote.branchId,
            });
        } else {
          // SPARE_PART: increment quantity via inventory REST (all returns → available stock)
          postCommitInventorySideEffect = () =>
            this.callInventoryService('/inventory/returns/process', {
              itemType: 'SPARE_PART',
              itemId: creditNote.sparePartId,
              quantity: creditNote.quantity || 1,
            });
        }

        // Create ReturnCredit via repository (B.8: use single consistent path)
        // Refund the customer what they actually paid — productAmount plus the VAT
        // charged on it, not just the taxable base. Omitting taxAmount understated
        // every "Total Returns" report by the VAT portion of each refund.
        await this.returnCreditRepo.createReturnCredit(
          {
            invoiceId: creditNote.invoiceId,
            branchId: creditNote.branchId,
            amount: Number(creditNote.productAmount) + Number(creditNote.taxAmount || 0),
            createdBy: req.user?.userId || 'FINANCE',
            note: `Refund for Credit Note ${creditNote.creditNoteNo}. Finance Note: ${financeNote}`,
            returnedItemId:
              creditNote.itemCategory === 'PRODUCT' ? creditNote.productId : creditNote.sparePartId,
            returnedItemType: creditNote.itemCategory as 'PRODUCT' | 'SPARE_PART',
          },
          queryRunner.manager,
        );

        // Close originating invoice — but only if this (plus any earlier completed
        // DIRECT_REFUNDs against the same invoice) covers EVERY refundable line.
        //
        // This used to hardcode `true` for PRODUCT, on the reasoning that a product
        // credit note is always for "the single serialized unit the invoice covers".
        // That stopped being true when Direct Sale gained multi-product support: a
        // 3-machine invoice had one machine returned and the whole invoice — all three
        // machines, the other two still validly sold — was stamped REFUNDED.
        // Both categories now go through the same coverage check.
        const invoiceFullyCovered = await this.isFullyReturned(queryRunner.manager, creditNote);
        if (invoiceFullyCovered) {
          await queryRunner.manager.update(Invoice, creditNote.invoiceId, {
            status: InvoiceStatus.REFUNDED,
          });
        }
        // Raise the refund the customer is owed as a ManualPayable — a real liability,
        // visible on the Payable Payments tab and counted in Accounts Payable.
        //
        // Creating it does NOT move money. It carries approvalStatus = PENDING, and
        // recordPayablePayment refuses to settle a credit-note row until Accounts has
        // approved it. Approving the credit note establishes that the refund is owed;
        // Accounts separately authorises paying it out.
        //
        // Idempotent on creditNoteId (unique partial index backs this up), so a second
        // approve can never raise a second refund.
        const existingRefund = await queryRunner.manager.findOne(ManualPayable, {
          where: { creditNoteId: creditNote.id },
        });
        if (!existingRefund) {
          const refund = computeRefundSettlement({
            productAmount: creditNote.productAmount,
            taxAmount: creditNote.taxAmount,
          });
          const todayStr = new Date().toISOString().slice(0, 10);
          const branchCurrency = await this.getBranchCurrency(
            creditNote.branchId,
            queryRunner.manager,
          );
          const payable = queryRunner.manager.create(ManualPayable, {
            referenceNo: `REFUND-${creditNote.creditNoteNo}`,
            type: SETTLEMENT_TYPES.CUSTOMER_REFUND,
            payableTo: creditNote.customerName,
            amount: refund.grossAmount,
            currency: branchCurrency,
            issueDate: new Date(todayStr),
            dueDate: new Date(todayStr),
            outstanding: refund.grossAmount,
            amountPaid: 0,
            status: 'PENDING',
            branchId: creditNote.branchId,
            createdBy: req.user?.userId || 'FINANCE',
            description: `Refund for Credit Note ${creditNote.creditNoteNo}`,
            // NOTE: linkedPurchaseId must stay null here. It means "this payable is a
            // vendor Purchase Order already tracked by the PO's own outstanding balance",
            // and every reader treats a non-null value as a reason to SKIP the row —
            // the Balance Sheet's Accounts Payable, the vendor statement drill-down and
            // the payables aggregation all filter on `linkedPurchaseId IS NULL`. Stuffing
            // the credit note's own id in here made customer refunds invisible as
            // liabilities: the money owed back to the customer never appeared in AP, so
            // Assets = Liabilities + Equity broke by the refund amount. The link back to
            // the credit note is carried by creditNoteId below.
            creditNoteId: creditNote.id,
            creditNoteNo: creditNote.creditNoteNo,
            paymentDirection: PaymentDirection.COMPANY_TO_CUSTOMER,
            approvalStatus: SettlementApprovalStatus.PENDING,
            netAmount: refund.netAmount,
            taxAmount: refund.taxAmount,
            discountAmount: 0,
            notes: financeNote,
          });
          await queryRunner.manager.save(ManualPayable, payable);
        }
      } else {
        // REPLACEMENT or CREDIT_EXCHANGE: Finance approval only — inventory updated later in complete()
        creditNote.status = CreditNoteStatus.APPROVED;
      }

      await queryRunner.manager.save(creditNote);
      await queryRunner.commitTransaction();

      if (postCommitInventorySideEffect) {
        try {
          await postCommitInventorySideEffect();
        } catch (sideEffectErr) {
          logger.error(
            `Credit Note ${creditNote.creditNoteNo} approved and refund recorded, but the inventory status update failed`,
            sideEffectErr,
          );
        }
      }

      // Notify the employee who created this credit note. A DIRECT_REFUND's credit note
      // is COMPLETED here, but the money is NOT paid — the refund it raised still has to
      // clear the Accounts approval gate and then actually be paid out, so the message
      // must not imply the customer has their money. REPLACEMENT/CREDIT_EXCHANGE is only
      // APPROVED and needs the employee to call complete() next.
      const isDirectRefund = creditNote.type === 'DIRECT_REFUND';
      try {
        await NotificationPublisher.publishInAppRequest({
          recipientId: creditNote.sellerEmployeeId,
          title: isDirectRefund
            ? 'Credit Note Approved — Refund Pending Payout'
            : 'Credit Note Approved',
          message: isDirectRefund
            ? `Your credit note ${creditNote.creditNoteNo} was approved. The refund is now with Accounts for payment approval — the customer has not been paid yet.`
            : `Your credit note ${creditNote.creditNoteNo} was approved by Finance — it's ready for you to complete the ${creditNote.type === 'REPLACEMENT' ? 'replacement' : 'exchange'}.`,
          type: 'CREDIT_NOTE_APPROVED',
          referenceId: creditNote.id,
          referenceType: 'CREDIT_NOTE',
        });
      } catch (err) {
        logger.error('Failed to notify employee about credit note approval', err);
      }
      // Notify the branch Manager and Admins — a completed refund changes the
      // originating invoice's status (see Part 3 of the notifications rollout).
      try {
        const { getBranchManager } = await import('../services/billingHelpers');
        const managerId = await getBranchManager(creditNote.branchId);
        if (managerId) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: managerId,
            title: 'Credit Note Approved',
            message: `Credit note ${creditNote.creditNoteNo} (${creditNote.itemCategory}) was approved.`,
            type: 'CREDIT_NOTE_APPROVED',
            referenceId: creditNote.id,
            referenceType: 'CREDIT_NOTE',
          });
        }
        await NotificationPublisher.publishInAppRequest({
          notifyAdmins: true,
          title: 'Credit Note Approved',
          message: `Credit note ${creditNote.creditNoteNo} (branch ${creditNote.branchId}) was approved.`,
          type: 'CREDIT_NOTE_APPROVED',
          referenceId: creditNote.id,
          referenceType: 'CREDIT_NOTE',
        });
      } catch (err) {
        logger.error('Failed to notify manager/admins about credit note approval', err);
      }

      return res.status(200).json({
        success: true,
        data: creditNote,
        message:
          creditNote.type === 'DIRECT_REFUND'
            ? 'Refund approved — awaiting Accounts approval before payout'
            : 'Credit Note Approved',
      });
    } catch (error) {
      // Guard against rolling back a transaction that already committed — e.g. if
      // the post-commit inventory side effect's own try/catch didn't fully contain
      // an error, or the response serialization itself throws after commit.
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      next(error);
    } finally {
      await queryRunner.release();
    }
  };

  /**
   * Finance Reject.
   */
  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) throw new AppError('Rejection reason is required', 400);

      const creditNote = await this.repository.findOne({ where: { id: id as string } });
      if (!creditNote) throw new AppError('Credit Note not found', 404);

      creditNote.status = CreditNoteStatus.REJECTED;
      creditNote.rejectionReason = rejectionReason;
      await this.repository.save(creditNote);

      try {
        await NotificationPublisher.publishInAppRequest({
          recipientId: creditNote.sellerEmployeeId,
          title: 'Credit Note Rejected',
          message: `Your credit note ${creditNote.creditNoteNo} was rejected by Finance. Reason: ${rejectionReason}.`,
          type: 'CREDIT_NOTE_REJECTED',
          referenceId: creditNote.id,
          referenceType: 'CREDIT_NOTE',
        });
      } catch (err) {
        logger.error('Failed to notify employee about credit note rejection', err);
      }
      try {
        const { getBranchManager } = await import('../services/billingHelpers');
        const managerId = await getBranchManager(creditNote.branchId);
        if (managerId) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: managerId,
            title: 'Credit Note Rejected',
            message: `Credit note ${creditNote.creditNoteNo} (${creditNote.itemCategory}) was rejected. Reason: ${rejectionReason}.`,
            type: 'CREDIT_NOTE_REJECTED',
            referenceId: creditNote.id,
            referenceType: 'CREDIT_NOTE',
          });
        }
        await NotificationPublisher.publishInAppRequest({
          notifyAdmins: true,
          title: 'Credit Note Rejected',
          message: `Credit note ${creditNote.creditNoteNo} (branch ${creditNote.branchId}) was rejected. Reason: ${rejectionReason}.`,
          type: 'CREDIT_NOTE_REJECTED',
          referenceId: creditNote.id,
          referenceType: 'CREDIT_NOTE',
        });
      } catch (err) {
        logger.error('Failed to notify manager/admins about credit note rejection', err);
      }

      return res.status(200).json({
        success: true,
        data: creditNote,
        message: 'Credit Note Rejected',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete Replacement / Exchange by Sales.
   * For PRODUCT: RabbitMQ events update product status in inventory.
   * For SPARE_PART: REST calls update available quantity in inventory.
   */
  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const creditNote = await this.repository.findOne({ where: { id: id as string } });
      if (!creditNote) throw new AppError('Credit Note not found', 404);
      if (creditNote.status !== CreditNoteStatus.APPROVED) {
        throw new AppError('Credit Note must be approved by Finance first', 400);
      }
      if (creditNote.type !== 'REPLACEMENT' && creditNote.type !== 'CREDIT_EXCHANGE') {
        throw new AppError(
          'complete() is only valid for REPLACEMENT and CREDIT_EXCHANGE types',
          400,
        );
      }

      creditNote.status = CreditNoteStatus.PRODUCT_REPLACED;

      const inventoryStatus: 'DAMAGED' | 'RETURNED' =
        creditNote.damageReason === 'Damaged Product' ? 'DAMAGED' : 'RETURNED';

      if (creditNote.itemCategory === 'PRODUCT') {
        const {
          replacementProductId,
          replacementProductName,
          replacementSerialNumber,
          replacementAmount,
          replacementDiscount = 0,
        } = req.body;

        creditNote.replacementProductId = replacementProductId;
        creditNote.replacementProductName = replacementProductName;
        creditNote.replacementSerialNumber = replacementSerialNumber;
        creditNote.replacementAmount = replacementAmount;
        creditNote.replacementDiscount = replacementDiscount;

        // Mark OLD product as DAMAGED or RETURNED (B.7: branchId passed)
        await emitProductStatusUpdate({
          productId: creditNote.productId!,
          billType: inventoryStatus,
          invoiceId: creditNote.invoiceId,
          approvedBy: req.user?.userId || 'SALES',
          approvedAt: new Date(),
          branchId: creditNote.branchId,
        });

        // Mark NEW product as SALE — 'SALE' is correct here; the replacement is a sale allocation
        await emitProductStatusUpdate({
          productId: replacementProductId,
          billType: 'SALE',
          invoiceId: creditNote.invoiceId,
          approvedBy: req.user?.userId || 'SALES',
          approvedAt: new Date(),
          branchId: creditNote.branchId,
        });
      } else {
        // SPARE_PART
        const {
          replacementSparePartId,
          replacementSparePartName,
          replacementSparePartSku,
          replacementQuantity,
          replacementAmount,
          replacementDiscount = 0,
        } = req.body;

        creditNote.replacementSparePartId = replacementSparePartId;
        creditNote.replacementSparePartName = replacementSparePartName;
        creditNote.replacementSparePartSku = replacementSparePartSku;
        creditNote.replacementQuantity = replacementQuantity || creditNote.quantity || 1;
        creditNote.replacementAmount = replacementAmount;
        creditNote.replacementDiscount = replacementDiscount;

        // Return old spare part to available stock
        await this.callInventoryService('/inventory/returns/process', {
          itemType: 'SPARE_PART',
          itemId: creditNote.sparePartId,
          quantity: creditNote.quantity || 1,
        });

        // Allocate new spare part (decrement available stock)
        if (replacementSparePartId) {
          await this.callInventoryService(
            `/inventory/spare-parts/${replacementSparePartId}/allocate`,
            { quantity: creditNote.replacementQuantity },
          );
        }
      }

      logger.info(`Completing Return: ${creditNote.creditNoteNo}, Status: ${creditNote.status}`);
      await this.repository.save(creditNote);

      // For CREDIT_EXCHANGE, raise the difference as a real receivable or payable that
      // must clear the Accounts approval gate before any money moves.
      // REPLACEMENT intentionally creates no financial record — a like-for-like swap
      // changes no consideration, so there is nothing to collect or refund.
      if (creditNote.type === 'CREDIT_EXCHANGE') {
        // Net of discount, plus VAT at the credit note's own rate — the same convention
        // the original sale line used. See computeExchangeSettlement for why the rate is
        // taken from the credit note rather than looked up again.
        const settlement = computeExchangeSettlement({
          originalAmount: creditNote.productAmount,
          replacementAmount: creditNote.replacementAmount ?? 0,
          replacementDiscount: creditNote.replacementDiscount ?? 0,
          taxPercent: creditNote.taxPercent,
        });
        const todayStr = new Date().toISOString().slice(0, 10);
        const branchCurrency = await this.getBranchCurrency(creditNote.branchId);
        const common = {
          referenceNo: `EXCH-${creditNote.creditNoteNo}`,
          currency: branchCurrency,
          issueDate: new Date(todayStr),
          dueDate: new Date(todayStr),
          amount: settlement.grossAmount,
          outstanding: settlement.grossAmount,
          amountPaid: 0,
          status: 'PENDING',
          branchId: creditNote.branchId,
          createdBy: req.user?.userId || 'SYSTEM',
          description: `Credit Exchange difference for ${creditNote.creditNoteNo}`,
          creditNoteId: creditNote.id,
          creditNoteNo: creditNote.creditNoteNo,
          paymentDirection: settlement.direction,
          approvalStatus: SettlementApprovalStatus.PENDING,
          netAmount: Math.abs(settlement.netAmount),
          taxAmount: settlement.taxAmount,
          discountAmount: settlement.discountAmount,
        };

        if (settlement.isZero) {
          // An even swap (or one the discount exactly cancels) settles nothing. Raising a
          // zero-value receivable would put a row in Accounts' queue with nothing to do.
          logger.info(`Credit Exchange ${creditNote.creditNoteNo}: no difference to settle`);
        } else if (settlement.direction === PaymentDirection.CUSTOMER_TO_COMPANY) {
          // Customer owes us. Idempotent on creditNoteId so a repeated complete() cannot
          // raise the difference twice.
          const recRepo = Source.getRepository(ManualReceivable);
          const existing = await recRepo.findOne({ where: { creditNoteId: creditNote.id } });
          if (!existing) {
            await recRepo.save(
              recRepo.create({
                ...common,
                type: SETTLEMENT_TYPES.CREDIT_EXCHANGE_RECEIPT,
                customerId: creditNote.customerId,
                customerName: creditNote.customerName,
                // linkedInvoiceId stays NULL. It means "this amount is already
                // represented by that invoice's outstanding balance", and the Balance
                // Sheet's Manual AR skips any row where that holds. Writing the credit
                // note's own id here — which is not an invoice at all — made the money
                // the customer owes vanish from Accounts Receivable while still showing
                // on the Receivables page. The link is carried by creditNoteId.
              }),
            );
            logger.info(
              `Credit Exchange ${creditNote.creditNoteNo}: receivable ${settlement.grossAmount} (net ${settlement.netAmount} + tax ${settlement.taxAmount}) awaiting Accounts approval`,
            );
          }
        } else {
          // We owe the customer.
          const payRepo = Source.getRepository(ManualPayable);
          const existing = await payRepo.findOne({ where: { creditNoteId: creditNote.id } });
          if (!existing) {
            await payRepo.save(
              payRepo.create({
                ...common,
                type: SETTLEMENT_TYPES.CREDIT_EXCHANGE_REFUND,
                payableTo: creditNote.customerName,
                // Same reason as the DIRECT_REFUND payable — leave linkedPurchaseId null.
              }),
            );
            logger.info(
              `Credit Exchange ${creditNote.creditNoteNo}: refund ${settlement.grossAmount} (net ${Math.abs(settlement.netAmount)} + tax ${settlement.taxAmount}) awaiting Accounts approval`,
            );
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: creditNote,
        message: 'Return Process Completed',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Stat cards data.
   */
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, userId, branchId } = req.user!;
      let query = this.repository
        .createQueryBuilder('cn')
        .where('cn.status != :draft', { draft: CreditNoteStatus.DRAFT });

      if (role !== 'FINANCE' && role !== 'ADMIN') {
        if (role === 'EMPLOYEE') {
          query = query.andWhere('cn.sellerEmployeeId = :userId', { userId });
        } else if (role === 'MANAGER') {
          query = query.andWhere('cn.branchId = :branchId', { branchId });
        }
      }

      const stats = await query
        .select('cn.type', 'type')
        .addSelect('COUNT(cn.id)', 'count')
        .groupBy('cn.type')
        .getRawMany();

      const result = {
        total: stats.reduce((acc, curr) => acc + parseInt(curr.count), 0),
        directRefund: stats.find((s) => s.type === 'DIRECT_REFUND')?.count || 0,
        replacement: stats.find((s) => s.type === 'REPLACEMENT')?.count || 0,
        creditExchange: stats.find((s) => s.type === 'CREDIT_EXCHANGE')?.count || 0,
      };

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
