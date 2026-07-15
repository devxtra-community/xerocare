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
    } = req.body;
    // @ts-expect-error: req.user is populated by auth middleware
    const recordedBy = req.user?.userId || req.user?.employeeId || 'SYSTEM';

    if (!invoiceId || !amountPaid || !paymentMode || !paymentDate) {
      throw new AppError('invoiceId, amountPaid, paymentMode, and paymentDate are required', 400);
    }

    const receiptFile = req.file as MulterS3File | undefined;
    // `.location` is the private R2 S3-API endpoint (requires SigV4 auth to GET).
    // Public access goes through the bucket's r2.dev public URL instead.
    const R2_BASE_URL =
      process.env.R2_PUBLIC_URL || 'https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev';
    const receiptUrl = receiptFile ? `${R2_BASE_URL}/${receiptFile.key}` : undefined;

    const payment = await paymentService.recordPayment({
      invoiceId,
      amountPaid: Number(amountPaid),
      paymentMode,
      paymentDate,
      referenceNumber,
      remarks,
      recordedBy,
      receiptUrl,
      chequeNumber: chequeNumber || undefined,
      chequeBankName: chequeBankName || undefined,
      chequeDueDate: chequeDueDate || undefined,
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
