import { InvoiceRepository } from '../repositories/invoiceRepository';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { publishInvoiceCreated } from '../events/publisher/billingPublisher';
import { SaleType } from '../entities/enums/saleType';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

export class BillingService {
  private invoiceRepo = new InvoiceRepository();

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceRepo.getInvoiceCountForYear(year);
    const paddedCount = String(count + 1).padStart(4, '0');
    return `INV-${year}-${paddedCount}`;
  }

  async createInvoice(payload: {
    branchId: string;
    createdBy: string;
    customerId: string; // Added field
    saleType: SaleType;

    startDate?: Date;
    endDate?: Date;
    billingCycleInDays?: number;

    items: {
      description: string;
      quantity: number;
      unitPrice: number;
    }[];
  }) {
    if (payload.saleType !== SaleType.SALE) {
      if (!payload.startDate || !payload.endDate) {
        throw new AppError('Start and end date required for RENT / LEASE', 400);
      }
    }

    const totalAmount = payload.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoiceItems = payload.items.map((item) => {
      const invoiceItem = new InvoiceItem();
      invoiceItem.description = item.description;
      invoiceItem.quantity = item.quantity;
      invoiceItem.unitPrice = item.unitPrice;
      return invoiceItem;
    });

    const invoice = await this.invoiceRepo.createInvoice({
      invoiceNumber,
      branchId: payload.branchId,
      createdBy: payload.createdBy,
      customerId: payload.customerId, // Persist customerId
      saleType: payload.saleType,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      billingCycleInDays: payload.billingCycleInDays,
      totalAmount,
      status: InvoiceStatus.PAID, // Payment assumed complete at creation
      items: invoiceItems,
    });

    try {
      await publishInvoiceCreated({
        invoiceId: invoice.id,
        branchId: invoice.branchId,
        totalAmount: invoice.totalAmount,
        createdBy: invoice.createdBy,
        createdAt: invoice.createdAt.toISOString(),
      });
    } catch (err) {
      logger.error('Failed to publish invoice.created', err);
    }

    return invoice;
  }

  async getAllInvoices() {
    return this.invoiceRepo.findAll();
  }

  async getInvoicesByCreator(creatorId: string) {
    return this.invoiceRepo.findByCreatorId(creatorId);
  }

  async getInvoiceById(id: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    return invoice;
  }

  async getInvoiceStats(filter: { createdBy?: string; branchId?: string } = {}) {
    const stats = await this.invoiceRepo.getStats(filter);
    const result: Record<string, number> = {
      SALE: 0,
      RENT: 0,
      LEASE: 0,
    };
    stats.forEach((s) => {
      result[s.saleType] = s.count;
    });
    return result;
  }
}
