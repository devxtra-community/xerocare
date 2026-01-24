import axios from 'axios';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { redis } from '../config/redis';

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://127.0.0.1:3002';
const VENDOR_INVENTORY_SERVICE_URL =
  process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://127.0.0.1:3003';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://127.0.0.1:3004';
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://127.0.0.1:3005';

// Enums
type InvoiceType = 'QUOTATION' | 'PROFORMA' | 'FINAL';
type RentType = 'FIXED_LIMIT' | 'FIXED_COMBO' | 'CPC' | 'CPC_COMBO';
type RentPeriod = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
type InvoiceStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'PAID' | 'CANCELLED';

interface InvoiceItem {
  id?: string;
  itemType: 'PRICING_RULE';
  description: string;

  // Fixed
  bwIncludedLimit?: number;
  colorIncludedLimit?: number;
  combinedIncludedLimit?: number;

  // Excess
  bwExcessRate?: number;
  colorExcessRate?: number;
  combinedExcessRate?: number;

  // Slabs
  bwSlabRanges?: Array<{ from: number; to: number; rate: number }>;
  colorSlabRanges?: Array<{ from: number; to: number; rate: number }>;
  comboSlabRanges?: Array<{ from: number; to: number; rate: number }>;

  // Legacy (ignored/nullable)
  quantity?: number;
  unitPrice?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  customerId?: string;
  createdBy: string;
  totalAmount?: number;
  status: InvoiceStatus;

  // Quotation Fields
  type: InvoiceType;
  rentType?: RentType;
  rentPeriod?: RentPeriod;
  monthlyRent?: number;
  advanceAmount?: number;
  discountPercent?: number;
  effectiveFrom: string;
  effectiveTo?: string;

  saleType: string;
  createdAt: string;
  items?: InvoiceItem[];
  startDate?: string;
  endDate?: string;
  billingCycleInDays?: number;
}

interface AggregatedInvoice extends Invoice {
  employeeName: string;
  branchName: string;
  customerName: string;
}

// Module-level cache for persistence across requests
const employeeCache = new Map<string, { name: string; timestamp: number }>();
const branchCache = new Map<string, { name: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 5 minutes

// Helper to fetch entity name with cache
const fetchEntityName = async (
  id: string | undefined,
  cache: Map<string, { name: string; timestamp: number }>,
  url: string,
  token: string,
  defaultName: string = 'Unknown',
): Promise<string> => {
  if (!id) return defaultName;
  const cached = cache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.name;
  }
  try {
    const res = await axios.get<{ data: { name: string } }>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const name = res.data.data.name;
    cache.set(id, { name, timestamp: Date.now() });
    return name;
  } catch {
    return defaultName;
  }
};

const fetchCustomerName = async (
  id: string | undefined,
  url: string,
  token: string,
  defaultName: string = 'Walk-in Customer',
): Promise<string> => {
  if (!id) return defaultName;

  // Try Redis first
  try {
    const cachedName = await redis.get(`customer:${id}`);
    if (cachedName) return cachedName;
  } catch (err) {
    logger.error('Redis get error', err);
  }

  // Fetch from Service
  try {
    const res = await axios.get<{ data: { name: string } }>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const name = res.data.data.name;

    // Store in Redis (1 hour TTL to be safe, but updates are pushed via RabbitMQ)
    try {
      await redis.set(`customer:${id}`, name, 'EX', 3600);
    } catch (err) {
      logger.error('Redis set error', err);
    }

    return name;
  } catch {
    return defaultName;
  }
};

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
            const [employeeName, branchName, customerName] = await Promise.all([
              fetchEntityName(
                inv.createdBy,
                employeeCache,
                `${EMPLOYEE_SERVICE_URL}/employee/public/${inv.createdBy}`,
                token,
              ),
              fetchEntityName(
                inv.branchId,
                branchCache,
                `${VENDOR_INVENTORY_SERVICE_URL}/branch/${inv.branchId}`,
                token,
              ),
              fetchCustomerName(
                inv.customerId,
                `${CRM_SERVICE_URL}/customers/${inv.customerId}`,
                token,
              ),
            ]);

            return {
              ...inv,
              employeeName,
              branchName,
              customerName,
            };
          } catch {
            return {
              ...inv,
              employeeName: 'Unknown',
              branchName: 'Unknown',
              customerName: 'Unknown',
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
        throw new AppError(
          error.response?.data?.message || 'Failed to fetch invoices',
          error.response?.status || 500,
        );
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
      // logger.info('Billing Service Response (My Invoices):', { data: billingResponse.data });
      const invoices = billingResponse.data.data;

      const aggregated = await Promise.all(
        invoices.map(async (inv) => {
          const customerName = await fetchCustomerName(
            inv.customerId,
            `${CRM_SERVICE_URL}/customers/${inv.customerId}`,
            token,
          );
          return {
            ...inv,
            employeeName: '',
            branchName: '',
            customerName,
          };
        }),
      );
      return aggregated;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error in fetch my invoices', {
          message: error.message,
          code: error.code,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          url: error.config?.url,
        });
        throw new AppError(
          error.response?.data?.message || 'Failed to fetch my invoices',
          error.response?.status || 500,
        );
      }
      logger.error('Unknown error in fetch my invoices', error);
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

      const [employeeName, branchName, customerName] = await Promise.all([
        fetchEntityName(
          invoice.createdBy,
          employeeCache,
          `${EMPLOYEE_SERVICE_URL}/employee/public/${invoice.createdBy}`,
          token,
        ),
        fetchEntityName(
          invoice.branchId,
          branchCache,
          `${VENDOR_INVENTORY_SERVICE_URL}/branch/${invoice.branchId}`,
          token,
        ),
        fetchCustomerName(
          invoice.customerId,
          `${CRM_SERVICE_URL}/customers/${invoice.customerId}`,
          token,
        ),
      ]);

      return {
        ...invoice,
        employeeName,
        branchName,
        customerName,
      };
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { status?: number } };
      logger.error('Failed to aggregate invoice data', {
        invoiceId,
        error: err.message,
      });

      if (axios.isAxiosError(error)) {
        throw new AppError(
          error.response?.data?.message || 'Failed to fetch invoice details',
          error.response?.status || 500,
        );
      }
      throw new AppError('Failed to fetch invoice details', 500);
    }
  }

  async createInvoice(
    payload: {
      branchId: string;
      customerId: string;
      saleType: string;
      rentType: RentType;
      rentPeriod: RentPeriod;
      monthlyRent?: number;
      advanceAmount?: number;
      discountPercent?: number;
      effectiveFrom: string;
      effectiveTo?: string;
      pricingItems: unknown[];
    },
    token: string,
  ): Promise<AggregatedInvoice> {
    try {
      // Forwarding to Billing Service. Assuming endpoint is /invoices/quotation
      // Since I haven't updated the Routing yet, I should probably check that.
      // But based on "Create Invoice behaves as Create Quotation", maybe I should use /invoices root?
      // I'll assume /invoices/quotation for clarity as per plan, but realize I need to implement that route in billing service.
      // Wait, I updated BillingService logic but did NOT update the Controller/Router in Billing Service yet.
      // I must do that in the NEXT step. For now, referencing the future endpoint.
      const billingResponse = await axios.post<{ data: Invoice }>(
        `${BILLING_SERVICE_URL}/invoices/quotation`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const invoice = billingResponse.data.data;

      const [employeeName, branchName, customerName] = await Promise.all([
        fetchEntityName(
          invoice.createdBy,
          employeeCache,
          `${EMPLOYEE_SERVICE_URL}/employee/public/${invoice.createdBy}`,
          token,
        ),
        fetchEntityName(
          invoice.branchId,
          branchCache,
          `${VENDOR_INVENTORY_SERVICE_URL}/branch/${invoice.branchId}`,
          token,
        ),
        fetchCustomerName(
          invoice.customerId,
          `${CRM_SERVICE_URL}/customers/${invoice.customerId}`,
          token,
        ),
      ]);

      return {
        ...invoice,
        employeeName,
        branchName,
        customerName,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error in create quotation', {
          message: error.message,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        });
        throw new AppError(
          error.response?.data?.message || 'Failed to create quotation',
          error.response?.status || 500,
        );
      }
      throw new AppError('Internal Gateway Error during quotation creation', 500);
    }
  }

  async updateQuotation(
    id: string,
    payload: {
      rentType?: RentType;
      rentPeriod?: RentPeriod;
      monthlyRent?: number;
      advanceAmount?: number;
      discountPercent?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
      pricingItems?: unknown[];
    },
    token: string,
  ): Promise<AggregatedInvoice> {
    try {
      const response = await axios.put<{ data: Invoice }>(
        `${BILLING_SERVICE_URL}/invoices/quotation/${id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const invoice = response.data.data;

      const [employeeName, branchName, customerName] = await Promise.all([
        fetchEntityName(
          invoice.createdBy,
          employeeCache,
          `${EMPLOYEE_SERVICE_URL}/employee/public/${invoice.createdBy}`,
          token,
        ),
        fetchEntityName(
          invoice.branchId,
          branchCache,
          `${VENDOR_INVENTORY_SERVICE_URL}/branch/${invoice.branchId}`,
          token,
        ),
        fetchCustomerName(
          invoice.customerId,
          `${CRM_SERVICE_URL}/customers/${invoice.customerId}`,
          token,
        ),
      ]);

      return {
        ...invoice,
        employeeName,
        branchName,
        customerName,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error in update quotation', {
          message: error.message,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        });
        throw new AppError(
          error.response?.data?.message || 'Failed to update quotation',
          error.response?.status || 500,
        );
      }
      throw new AppError('Internal Gateway Error during quotation update', 500);
    }
  }

  async recordUsage(
    payload: {
      contractId: string;
      billingPeriodStart: string;
      billingPeriodEnd: string;
      bwA4Count: number;
      bwA3Count: number;
      colorA4Count: number;
      colorA3Count: number;
      reportedBy: 'CUSTOMER' | 'EMPLOYEE'; // Using string union to match
      remarks?: string;
    },
    token: string,
  ) {
    try {
      const response = await axios.post(`${BILLING_SERVICE_URL}/usage`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error in record usage', {
          message: error.message,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        });
        throw new AppError(
          error.response?.data?.message || 'Failed to record usage',
          error.response?.status || 500,
        );
      }
      throw new AppError('Internal Gateway Error during usage recording', 500);
    }
  }

  async approveQuotation(
    id: string,
    deposit: { amount: number; mode: string; reference?: string; receivedDate?: string },
    token: string,
  ) {
    try {
      const response = await axios.put<{ data: Invoice }>(
        `${BILLING_SERVICE_URL}/invoices/${id}/approve`,
        { deposit },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error in approve quotation', {
          message: error.message,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        });
        throw new AppError(
          error.response?.data?.message || 'Failed to approve quotation',
          error.response?.status || 500,
        );
      }
      throw new AppError('Internal Gateway Error during quotation approval', 500);
    }
  }

  async generateFinalInvoice(
    payload: {
      contractId: string;
      billingPeriodStart: string;
      billingPeriodEnd: string;
    },
    token: string,
  ): Promise<AggregatedInvoice> {
    try {
      const response = await axios.post<{ data: Invoice }>(
        `${BILLING_SERVICE_URL}/invoices/settlements/generate`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const invoice = response.data.data;

      // Aggregate details
      const [employeeName, branchName, customerName] = await Promise.all([
        fetchEntityName(
          invoice.createdBy,
          employeeCache,
          `${EMPLOYEE_SERVICE_URL}/employee/public/${invoice.createdBy}`,
          token,
        ),
        fetchEntityName(
          invoice.branchId,
          branchCache,
          `${VENDOR_INVENTORY_SERVICE_URL}/branch/${invoice.branchId}`,
          token,
        ),
        fetchCustomerName(
          invoice.customerId,
          `${CRM_SERVICE_URL}/customers/${invoice.customerId}`,
          token,
        ),
      ]);

      return {
        ...invoice,
        employeeName,
        branchName,
        customerName,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error in generate final invoice', {
          message: error.message,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        });
        throw new AppError(
          error.response?.data?.message || 'Failed to generate final invoice',
          error.response?.status || 500,
        );
      }
      throw new AppError('Internal Gateway Error during final invoice generation', 500);
    }
  }

  async getInvoiceStats(
    user: { userId: string; role: string; branchId?: string },
    token: string,
    branchId?: string,
  ) {
    const url = `${BILLING_SERVICE_URL}/invoices/stats`;
    const params: { createdBy?: string; branchId?: string } = {};

    if (user.role === 'EMPLOYEE') {
      params.createdBy = user.userId;
    } else if (branchId) {
      params.branchId = branchId;
    }

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    return response.data.data;
  }
}
