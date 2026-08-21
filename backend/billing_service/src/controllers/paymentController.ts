import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';
import { AppError } from '../errors/appError';
import { MulterS3File } from '../types/multer-s3-file';

const paymentService = new PaymentService();

export const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      invoiceId,
      amountPaid,
      paymentMode,
      paymentDate,
      referenceNumber,
      remarks,
      chequeNumber,
      chequeBankName,
      chequeDueDate,
      chequeDate,
      currency,
      exchangeRate,
    } = req.body;
    // @ts-expect-error: req.user is populated by auth middleware
    const recordedBy = req.user?.userId || req.user?.employeeId || 'SYSTEM';

    if (!invoiceId || !amountPaid || !paymentMode || !paymentDate) {
      throw new AppError('invoiceId, amountPaid, paymentMode, and paymentDate are required', 400);
    }

    const receiptFile = req.file as MulterS3File | undefined;
    // Payment receipts are private: persist the object key. Readers get a
    // short-lived signed link (`.location` and public URLs are both unusable —
    // the former needs SigV4, the latter is not served for this bucket).
    const receiptUrl = receiptFile?.key;

    const payment = await paymentService.recordPayment({
      invoiceId,
      amountPaid: Number(amountPaid),
      paymentMode,
      paymentDate,
      referenceNumber,
      remarks,
      recordedBy,
      receiptUrl,
      chequeNumber,
      chequeBankName,
      chequeDueDate,
      chequeDate,
      currencyCode: currency || undefined,
      exchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentsByInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.invoiceId as string;
    if (!invoiceId) {
      throw new AppError('invoiceId is required', 400);
    }

    const payments = await paymentService.getPaymentsByInvoice(invoiceId);

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

export const getAccountSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.invoiceId as string;
    if (!invoiceId) {
      throw new AppError('invoiceId is required', 400);
    }

    const summary = await paymentService.getAccountSummary(invoiceId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
