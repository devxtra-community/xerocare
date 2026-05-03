import { Source } from '../config/dataSource';
import { PaymentLedger, PaymentMode } from '../entities/paymentLedgerEntity';
import { Invoice } from '../entities/invoiceEntity';
import { AppError } from '../errors/appError';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { logger } from '../config/logger';

export class PaymentService {
  private paymentRepo = Source.getRepository(PaymentLedger);
  private invoiceRepo = Source.getRepository(Invoice);

  async recordPayment(data: {
    invoiceId: string;
    amountPaid: number;
    paymentMode: PaymentMode;
    paymentDate: string | Date;
    referenceNumber?: string;
    remarks?: string;
    recordedBy: string;
  }): Promise<PaymentLedger> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: data.invoiceId } });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!invoice.totalAmount) {
      throw new AppError('Invoice does not have a total amount set', 400);
    }

    // Get all previous payments to validate balance
    const previousPayments = await this.paymentRepo.find({ where: { invoiceId: data.invoiceId } });
    const totalPaidSoFar = previousPayments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const pendingBalance = Number(invoice.totalAmount) - totalPaidSoFar;

    if (data.amountPaid <= 0) {
      throw new AppError('Payment amount must be greater than zero', 400);
    }

    // Allow a small epsilon for floating point errors
    if (data.amountPaid > pendingBalance + 0.01) {
      throw new AppError(
        `Payment amount (${data.amountPaid}) exceeds pending balance (${pendingBalance})`,
        400,
      );
    }

    const payment = this.paymentRepo.create({
      invoiceId: data.invoiceId,
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      paymentDate: new Date(data.paymentDate),
      referenceNumber: data.referenceNumber,
      remarks: data.remarks,
      recordedBy: data.recordedBy,
    });

    await this.paymentRepo.save(payment);
    logger.info(`Recorded payment of ${data.amountPaid} for Invoice ${invoice.invoiceNumber}`);

    // If fully paid, optionally update invoice status (e.g., PAID or TRANSACTION_COMPLETED)
    const newTotalPaid = totalPaidSoFar + data.amountPaid;
    if (newTotalPaid >= Number(invoice.totalAmount) - 0.01) {
      if (
        invoice.status !== InvoiceStatus.PAID &&
        invoice.status !== InvoiceStatus.TRANSACTION_COMPLETED
      ) {
        invoice.status = InvoiceStatus.PAID;
        await this.invoiceRepo.save(invoice);
        logger.info(`Invoice ${invoice.invoiceNumber} marked as PAID`);
      }
    }

    return payment;
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentLedger[]> {
    return this.paymentRepo.find({
      where: { invoiceId },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async getAccountSummary(invoiceId: string) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const payments = await this.getPaymentsByInvoice(invoiceId);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const totalAmount = Number(invoice.totalAmount || 0);
    const pendingBalance = totalAmount - totalPaid;

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerId, // Note: Customer name might need to be fetched via CRM if needed, or frontend handles it
      totalAmount,
      totalPaid,
      pendingBalance,
      payments,
      status: invoice.status,
    };
  }
}
