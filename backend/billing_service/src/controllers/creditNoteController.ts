import { Request, Response, NextFunction } from 'express';
import { EntityManager } from 'typeorm';
import { Source } from '../config/dataSource';
import { CreditNote } from '../entities/creditNoteEntity';
import { CreditNoteStatus } from '../entities/enums/creditNoteStatus';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { emitProductStatusUpdate } from '../events/publisher/productStatusEvent';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { ReturnCreditRepository } from '../repositories/returnCreditRepository';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { CreditNoteType } from '../entities/enums/creditNoteType';

export class CreditNoteController {
  private repository = Source.getRepository(CreditNote);
  private returnCreditRepo = new ReturnCreditRepository();

  // ── Shared helper: has the full quantity sold on this invoice line now been
  // returned, counting this credit note plus any earlier completed DIRECT_REFUNDs
  // against the same invoice+spare part? Only then should the invoice itself be
  // marked REFUNDED — a partial return must leave it as-is (the enum has no
  // PARTIALLY_REFUNDED state; better to under-signal than to falsely mark a
  // still-mostly-valid sale as fully refunded).
  private async isFullyReturned(manager: EntityManager, creditNote: CreditNote): Promise<boolean> {
    const items = await manager.find(InvoiceItem, {
      where: { invoice: { id: creditNote.invoiceId }, sparePartId: creditNote.sparePartId },
    });
    const totalSoldQty = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
    if (totalSoldQty <= 0) return true; // no line-item data to compare against — don't block the refund

    const priorReturns = await manager.find(CreditNote, {
      where: {
        invoiceId: creditNote.invoiceId,
        sparePartId: creditNote.sparePartId,
        type: CreditNoteType.DIRECT_REFUND,
        status: CreditNoteStatus.COMPLETED,
      },
    });
    const priorReturnedQty = priorReturns
      .filter((cn) => cn.id !== creditNote.id)
      .reduce((sum, cn) => sum + (cn.quantity ?? 0), 0);
    const totalReturnedQty = priorReturnedQty + (creditNote.quantity ?? 1);

    return totalReturnedQty >= totalSoldQty;
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

      const inventoryStatus: 'DAMAGED' | 'RETURNED' =
        damageReason === 'Damaged Product' ? 'DAMAGED' : 'RETURNED';
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
        // DIRECT_REFUNDs against the same line) covers the FULL quantity sold.
        // A partial spare-part return (e.g. 2 of 5 units) must not mark the whole
        // invoice REFUNDED — the other 3 units are still validly sold to the
        // customer. PRODUCT credit notes are always for the single serialized
        // unit the invoice covers, so they always fully close the invoice.
        const invoiceFullyCovered =
          creditNote.itemCategory === 'PRODUCT'
            ? true
            : await this.isFullyReturned(queryRunner.manager, creditNote);
        if (invoiceFullyCovered) {
          await queryRunner.manager.update(Invoice, creditNote.invoiceId, {
            status: InvoiceStatus.REFUNDED,
          });
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

      return res.status(200).json({
        success: true,
        data: creditNote,
        message: creditNote.type === 'DIRECT_REFUND' ? 'Refund Completed' : 'Credit Note Approved',
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
