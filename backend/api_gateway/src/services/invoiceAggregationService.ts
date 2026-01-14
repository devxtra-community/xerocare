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
  async getAllInvoices(
    user: { role: string; branchId?: string },
    token: string,
  ): Promise<AggregatedInvoice[]> {
    try {
      const billingResponse = await axios.get<{ data: Invoice[] }>(
        `${BILLING_SERVICE_URL}/invoices`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      let invoices = billingResponse.data.data;

      if (user.role === 'ADMIN' || user.role === 'FINANCE') {
        // No filtering required for ADMIN or FINANCE roles
      } else if (user.role === 'EMPLOYEE') {
        if (!user.branchId) {
          throw new AppError('Employee has no branch assigned', 403);
        }
        invoices = invoices.filter((inv) => inv.branchId === user.branchId);
      } else {
        throw new AppError('Access Denied', 403);
      }

      if (invoices.length === 0) {
        return [];
      }

      const aggregatedInvoices = await Promise.all(
        invoices.map(async (inv) => {
          try {
            const employeeResponse = await axios.get<{ data: { name: string } }>(
              `${EMPLOYEE_SERVICE_URL}/employee/public/${inv.createdBy}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const employeeName = employeeResponse.data.data.name;

            const branchResponse = await axios.get<{ data: { name: string } }>(
              `${VENDOR_INVENTORY_SERVICE_URL}/branch/${inv.branchId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const branchName = branchResponse.data.data.name;

            return {
              ...inv,
              employeeName,
              branchName,
            };
          } catch (e: unknown) {
            const err = e as { message?: string; response?: { status?: number; data?: unknown } };
            logger.error('Failed to fetch details for invoice', {
              invoiceId: inv.id,
              error: err.message,
              status: err.response?.status,
              data: err.response?.data,
            });
            return {
              ...inv,
              employeeName: 'Unknown',
              branchName: 'Unknown',
            };
          }
        }),
      );

      return aggregatedInvoices;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error in fetch and aggregate invoices', {
          message: error.message,
          code: error.code,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        });
      } else {
        const err = error as { message?: string };
        logger.error('Failed to fetch and aggregate invoices', {
          error: err.message,
          stack: (error as Error).stack,
        });
      }
      throw new AppError('Failed to fetch invoices', 500);
    }
  }

  async getMyInvoices(token: string): Promise<AggregatedInvoice[]> {
    try {
      const billingResponse = await axios.get<{ data: Invoice[] }>(
        `${BILLING_SERVICE_URL}/invoices/my-invoices`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const invoices = billingResponse.data.data;

      if (invoices.length === 0) {
        return [];
      }

      const aggregatedInvoices = await Promise.all(
        invoices.map(async (inv) => {
          try {
            const employeeResponse = await axios.get<{ data: { name: string } }>(
              `${EMPLOYEE_SERVICE_URL}/employee/public/${inv.createdBy}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const employeeName = employeeResponse.data.data.name;

            const branchResponse = await axios.get<{ data: { name: string } }>(
              `${VENDOR_INVENTORY_SERVICE_URL}/branch/${inv.branchId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const branchName = branchResponse.data.data.name;

            return {
              ...inv,
              employeeName,
              branchName,
            };
          } catch (e: unknown) {
            const err = e as { message?: string; response?: { status?: number; data?: unknown } };
            logger.error('Failed to fetch details for invoice', {
              invoiceId: inv.id,
              error: err.message,
              status: err.response?.status,
              data: err.response?.data,
            });
            return {
              ...inv,
              employeeName: 'Unknown',
              branchName: 'Unknown',
            };
          }
        }),
      );

      return aggregatedInvoices;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error in fetch my invoices', {
          message: error.message,
          code: error.code,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        });
      }
      throw new AppError('Failed to fetch my invoices', 500);
    }
  }

  async getInvoiceById(invoiceId: string, token: string): Promise<AggregatedInvoice> {
    try {
      const invoiceResponse = await axios.get<{ data: Invoice }>(
        `${BILLING_SERVICE_URL}/invoices/${invoiceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const invoice = invoiceResponse.data.data;

      const employeeResponse = await axios.get<{ data: { name: string } }>(
        `${EMPLOYEE_SERVICE_URL}/employee/public/${invoice.createdBy}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const employeeName = employeeResponse.data.data.name;

      const branchResponse = await axios.get<{ data: { name: string } }>(
        `${VENDOR_INVENTORY_SERVICE_URL}/branch/${invoice.branchId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
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
