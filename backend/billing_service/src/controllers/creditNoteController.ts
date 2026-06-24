import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { Like } from 'typeorm';
import { CreditNote } from '../entities/creditNoteEntity';
import { CreditNoteStatus } from '../entities/enums/creditNoteStatus';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { emitProductStatusUpdate } from '../events/publisher/productStatusEvent';
import { ReturnCredit } from '../entities/returnCreditEntity';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';

export class CreditNoteController {
  private repository = Source.getRepository(CreditNote);

  /**
   * Create a new Credit Note in DRAFT status.
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        invoiceId,
        invoiceNumber,
        customerId,
        customerName,
        branchId,
        productId,
        productName,
        modelName,
        brand,
        serialNumber,
        productAmount,
        type,
        notes,
        sellerEmployeeId,
      } = req.body;

      if (!invoiceId || !invoiceNumber || !customerId || !customerName || !productId || !type) {
        throw new AppError('Missing required fields', 400);
      }

      // Generate Credit Note Number: CN-YYYY-XXXXX
      const year = new Date().getFullYear();
      const count = await this.repository.count({
        where: { creditNoteNo: Like(`CN-${year}-%`) },
      });
      const sequence = (count + 1).toString().padStart(5, '0');
      const creditNoteNo = `CN-${year}-${sequence}`;

      const creditNote = this.repository.create({
        creditNoteNo,
        invoiceId,
        invoiceNumber,
        customerId,
        customerName,
        branchId: branchId || req.user?.branchId,
        productId,
        productName,
        modelName,
        brand,
        serialNumber,
        productAmount,
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
        // Finance sees everything sent to them
        query = query.where('cn.status != :draft', { draft: CreditNoteStatus.DRAFT });
      } else {
        // Sales Employee/Manager sees their own or branch ones
        if (role === 'EMPLOYEE') {
          query = query.where('cn.sellerEmployeeId = :userId', { userId });
        } else if (role === 'MANAGER') {
          query = query.where('cn.branchId = :branchId', { branchId });
        }
      }

      const list = await query.orderBy('cn.createdAt', 'DESC').getMany();

      return res.status(200).json({
        success: true,
        data: list,
      });
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

      return res.status(200).json({
        success: true,
        message: 'Credit Note deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send Credit Note to Finance.
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
   * Finance Approval Flow.
   */
  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { financeNote, damageReason } = req.body;

      if (!financeNote || !damageReason) {
        throw new AppError('Finance note and damage reason are required', 400);
      }

      const creditNote = await this.repository.findOne({ where: { id: id as string } });
      if (!creditNote) throw new AppError('Credit Note not found', 404);
      if (creditNote.status !== CreditNoteStatus.PENDING_APPROVAL) {
        throw new AppError('Invalid status for approval', 400);
      }

      creditNote.financeNote = financeNote;
      creditNote.damageReason = damageReason;

      const inventoryStatus: 'DAMAGED' | 'RETURNED' =
        damageReason === 'Damaged Product' ? 'DAMAGED' : 'RETURNED';

      if (creditNote.type === 'DIRECT_REFUND') {
        creditNote.status = CreditNoteStatus.COMPLETED;

        // Mark unit as Damaged or Returned
        await emitProductStatusUpdate({
          productId: creditNote.productId,
          billType: inventoryStatus,
          invoiceId: creditNote.invoiceId,
          approvedBy: req.user?.userId || 'FINANCE',
          approvedAt: new Date(),
        });

        // Deduct from sales by creating a ReturnCredit entry
        const returnCreditRepo = Source.getRepository(ReturnCredit);
        await returnCreditRepo.save({
          invoiceId: creditNote.invoiceId,
          branchId: creditNote.branchId,
          amount: creditNote.productAmount,
          createdBy: req.user?.userId || 'FINANCE',
          note: `Refund for Credit Note ${creditNote.creditNoteNo}. Finance Note: ${financeNote}`,
          returnedItemId: creditNote.productId,
          returnedItemType: 'PRODUCT',
        });

        // Update Invoice status to REFUNDED
        const invoiceRepo = Source.getRepository(Invoice);
        await invoiceRepo.update(creditNote.invoiceId, { status: InvoiceStatus.REFUNDED });
      } else {
        creditNote.status = CreditNoteStatus.APPROVED;
      }

      await this.repository.save(creditNote);

      return res.status(200).json({
        success: true,
        data: creditNote,
        message: creditNote.type === 'DIRECT_REFUND' ? 'Refund Completed' : 'Credit Note Approved',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Finance Reject Flow.
   */
  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        throw new AppError('Rejection reason is required', 400);
      }

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
   * Complete Replacement/Exchange by Sales.
   */
  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        replacementProductId,
        replacementProductName,
        replacementSerialNumber,
        replacementAmount,
        replacementDiscount = 0,
      } = req.body;

      const creditNote = await this.repository.findOne({ where: { id: id as string } });
      if (!creditNote) throw new AppError('Credit Note not found', 404);
      if (creditNote.status !== CreditNoteStatus.APPROVED) {
        throw new AppError('Credit Note must be approved by Finance first', 400);
      }
      if (creditNote.type === 'REPLACEMENT' || creditNote.type === 'CREDIT_EXCHANGE') {
        creditNote.status = CreditNoteStatus.PRODUCT_REPLACED;
      } else {
        creditNote.status = CreditNoteStatus.COMPLETED;
      }
      creditNote.replacementProductId = replacementProductId;
      creditNote.replacementProductName = replacementProductName;
      creditNote.replacementSerialNumber = replacementSerialNumber;
      creditNote.replacementAmount = replacementAmount;
      creditNote.replacementDiscount = replacementDiscount;

      logger.info(
        `Completing Return: ${creditNote.creditNoteNo}, New Status: ${creditNote.status}`,
      );
      await this.repository.save(creditNote);
      logger.info(`Credit Note ${creditNote.creditNoteNo} saved successfully.`);

      // 1. Mark OLD unit as Damaged or Returned
      const inventoryStatus: 'DAMAGED' | 'RETURNED' =
        creditNote.damageReason === 'Damaged Product' ? 'DAMAGED' : 'RETURNED';
      await emitProductStatusUpdate({
        productId: creditNote.productId,
        billType: inventoryStatus,
        invoiceId: creditNote.invoiceId,
        approvedBy: req.user?.userId || 'SALES',
        approvedAt: new Date(),
      });

      await emitProductStatusUpdate({
        productId: replacementProductId,
        billType: 'SALE', // Defaulting to SALE for now, ideally fetch from Invoice
        invoiceId: creditNote.invoiceId,
        approvedBy: req.user?.userId || 'SALES',
        approvedAt: new Date(),
      });

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
   * Get Stat Cards data.
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

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
