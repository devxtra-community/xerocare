import axios from 'axios';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
const VENDOR_INVENTORY_SERVICE_URL =
  process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://localhost:3003';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';

interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  createdBy: string;
  totalAmount: number;
  status: string;
  saleType: string;
  createdAt: string;
}

interface AggregatedInvoice extends Invoice {
  employeeName: string;
  branchName: string;
}

export class InvoiceAggregationService {
  async getInvoiceById(invoiceId: string): Promise<AggregatedInvoice> {
    try {
      const invoiceResponse = await axios.get<{ data: Invoice }>(
        `${BILLING_SERVICE_URL}/invoices/${invoiceId}`,
      );
      const invoice = invoiceResponse.data.data;

      const employeeResponse = await axios.get<{ data: { name: string } }>(
        `${EMPLOYEE_SERVICE_URL}/employee/${invoice.createdBy}`,
      );

      const employeeName = employeeResponse.data.data.name;

      const branchResponse = await axios.get<{ data: { name: string } }>(
        `${VENDOR_INVENTORY_SERVICE_URL}/branch/${invoice.branchId}`,
      );
      const branchName = branchResponse.data.data.name;

      return {
        ...invoice,
        employeeName,
        branchName,
      };
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { status?: number } };
      logger.error('Failed to aggregate invoice data', {
        invoiceId,
        error: err.message,
      });

      if (err.response?.status === 404) {
        throw new AppError('Invoice not found', 404);
      }

      throw new AppError('Failed to fetch invoice details', 500);
    }
  }
}
