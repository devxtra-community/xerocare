import { sign } from 'jsonwebtoken';
import { Invoice } from '../entities/invoiceEntity';
import { SaleType } from '../entities/enums/saleType';
import { Source } from '../config/dataSource';
import { SalePaymentRequest } from '../entities/salePaymentRequestEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';

interface EmployeeData {
  id: string;
  branch_id?: string;
  email?: string;
}

const employeeCache = new Map<
  string,
  { details: { name: string; first_name: string; last_name: string } | null; cachedAt: number }
>();
const customerCache = new Map<string, { name: string; cachedAt: number }>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getEmployeeDetails(
  employeeId: string | undefined,
): Promise<{ name: string; first_name: string; last_name: string } | null> {
  if (!employeeId) return null;
  const cached = employeeCache.get(employeeId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.details;
  }

  try {
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${employeeServiceUrl}/employee/${employeeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      employeeCache.set(employeeId, { details: null, cachedAt: Date.now() });
      return null;
    }
    const data = await response.json();
    const emp = data.data;
    if (emp) {
      const details = {
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee',
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
      };
      employeeCache.set(employeeId, { details, cachedAt: Date.now() });
      return details;
    }
    employeeCache.set(employeeId, { details: null, cachedAt: Date.now() });
    return null;
  } catch (err) {
    console.error('Error fetching employee details:', err);
    return null;
  }
}

export async function getCustomerName(customerId: string | undefined): Promise<string> {
  if (!customerId) return 'Customer';
  const cached = customerCache.get(customerId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.name;
  }

  try {
    const crmServiceUrl = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${crmServiceUrl}/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return 'Customer';
    }
    const json = await response.json();
    const customer = json?.data;
    if (customer) {
      const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
      customerCache.set(customerId, { name, cachedAt: Date.now() });
      return name;
    }
    return 'Customer';
  } catch (err) {
    console.error('Error fetching customer details:', err);
    return 'Customer';
  }
}

export async function getFinanceEmployeesByBranch(branchId: string | undefined): Promise<string[]> {
  if (!branchId) return [];
  try {
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${employeeServiceUrl}/employee?role=FINANCE&limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];
    const json = await response.json();
    const employees = json?.data?.employees || [];
    return employees
      .filter((emp: EmployeeData) => emp.branch_id === branchId)
      .map((emp: EmployeeData) => emp.id);
  } catch (err) {
    console.error('Error fetching finance employees:', err);
    return [];
  }
}

export async function getBranchManager(branchId: string | undefined): Promise<string | null> {
  if (!branchId) return null;
  try {
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${employeeServiceUrl}/employee?role=MANAGER&limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;
    const json = await response.json();
    const employees = json?.data?.employees || [];
    const manager = employees.find((emp: EmployeeData) => emp.branch_id === branchId);
    return manager ? manager.id : null;
  } catch (err) {
    console.error('Error fetching branch manager:', err);
    return null;
  }
}

interface BranchCurrencyInfo {
  currencyCode: string;
  hasTax: boolean;
  taxName?: string;
  taxPercent?: number;
  taxRegistrationNumber?: string;
}

const branchCurrencyCache = new Map<
  string,
  { info: BranchCurrencyInfo | null; cachedAt: number }
>();

export async function getBranchCurrencyInfo(branchId: string): Promise<BranchCurrencyInfo | null> {
  if (!branchId) return null;

  const cached = branchCurrencyCache.get(branchId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.info;
  }

  try {
    const vendorServiceUrl = process.env.VENDOR_SERVICE_URL || 'http://localhost:3003';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${vendorServiceUrl}/branch/${branchId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      branchCurrencyCache.set(branchId, { info: null, cachedAt: Date.now() });
      return null;
    }

    const json = await response.json();
    const branch = json?.data;

    if (!branch) {
      branchCurrencyCache.set(branchId, { info: null, cachedAt: Date.now() });
      return null;
    }

    const info: BranchCurrencyInfo = {
      currencyCode: branch.currency_code || 'AED',
      hasTax: branch.has_tax || false,
      taxName: branch.tax_name || undefined,
      taxPercent: branch.tax_percent ? Number(branch.tax_percent) : undefined,
      taxRegistrationNumber: branch.tax_registration_number || undefined,
    };

    branchCurrencyCache.set(branchId, { info, cachedAt: Date.now() });
    return info;
  } catch (err) {
    console.error('Error fetching branch currency info:', err);
    return null;
  }
}

const branchNameCache = new Map<string, { name: string | null; cachedAt: number }>();

export async function getBranchName(branchId: string | undefined): Promise<string | null> {
  if (!branchId) return null;
  const cached = branchNameCache.get(branchId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.name;
  }

  try {
    const vendorServiceUrl = process.env.VENDOR_SERVICE_URL || 'http://localhost:3003';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${vendorServiceUrl}/branch/${branchId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      branchNameCache.set(branchId, { name: null, cachedAt: Date.now() });
      return null;
    }

    const json = await response.json();
    const name = json?.data?.name || null;
    branchNameCache.set(branchId, { name, cachedAt: Date.now() });
    return name;
  } catch (err) {
    console.error('Error fetching branch name:', err);
    return null;
  }
}

/**
 * Resolves employee ids whose name matches `search`, across all branches — branch
 * scoping is applied separately by the caller against its own (already
 * branch-filtered) rows, so this intentionally does not take a branchId.
 */
export async function searchEmployeesByName(search: string): Promise<string[]> {
  if (!search.trim()) return [];
  try {
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const params = new URLSearchParams({ search: search.trim(), limit: '500' });
    const response = await fetch(`${employeeServiceUrl}/employee?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return [];
    const json = await response.json();
    const employees = json?.data?.employees || [];
    return employees.map((emp: EmployeeData) => emp.id);
  } catch (err) {
    console.error('Error searching employees by name:', err);
    return [];
  }
}

export function getProductNamesFromInvoice(invoice: Invoice): string {
  if (!invoice.items || invoice.items.length === 0) {
    return 'Product/Spare Part';
  }
  return invoice.items.map((item) => item.description).join(', ');
}

export function getInvoicePrice(invoice: Invoice): number {
  if (invoice.saleType === SaleType.RENT) {
    return invoice.monthlyRent || invoice.totalAmount || 0;
  } else if (invoice.saleType === SaleType.LEASE) {
    return invoice.monthlyLeaseAmount || invoice.monthlyEmiAmount || invoice.totalAmount || 0;
  } else {
    return invoice.totalAmount || 0;
  }
}

export async function getBranchManagerEmail(branchId: string | undefined): Promise<string | null> {
  if (!branchId) return null;
  try {
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${employeeServiceUrl}/employee?role=MANAGER&limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;
    const json = await response.json();
    const employees = json?.data?.employees || [];
    const manager = employees.find((emp: EmployeeData) => emp.branch_id === branchId);
    return manager ? manager.email : null;
  } catch (err) {
    console.error('Error fetching branch manager email:', err);
    return null;
  }
}

/**
 * Looks up every employee_service user with the given role at a branch — used for
 * in-app notification fan-out (e.g. every Finance user at a branch, not just one).
 *
 * Replaces a direct `SELECT ... FROM branches` query that used to run against this
 * service's OWN database — billing_service has no `branches` table at all (that's
 * employee_service's), so that query threw "relation branches does not exist" on every
 * single call. It was never caught per-recipient, only by one try/catch around the
 * entire caller, so hitting it didn't just skip one notification — it silently aborted
 * whatever loop/job called it partway through, for every contract still queued behind
 * it. Routing through the same HTTP lookup getBranchManagerEmail already uses avoids
 * that failure mode entirely.
 */
export async function getBranchStaffByRole(
  branchId: string | undefined,
  role: 'MANAGER' | 'FINANCE',
): Promise<EmployeeData[]> {
  if (!branchId) return [];
  try {
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${employeeServiceUrl}/employee?role=${role}&limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];
    const json = await response.json();
    const employees = json?.data?.employees || [];
    return employees.filter((emp: EmployeeData) => emp.branch_id === branchId);
  } catch (err) {
    console.error(`Error fetching branch ${role} staff:`, err);
    return [];
  }
}

const REFERENCE_MODE_PREFIX: Record<string, string> = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK',
  CREDIT_CARD: 'CARD',
};

/**
 * Auto-generates the payment "Reference Number" for Cash / Bank Transfer / Credit Card
 * collections — every collecting form used to leave this as a free-text box the
 * employee could fill in (or not), with no real link back to anything. Cheque payments
 * are untouched: their Cheque Number field already IS their reference, so this returns
 * undefined for CHEQUE (and for any other/unrecognised mode) and callers must leave
 * whatever they already had for it.
 *
 * Format: <MODE>-<YYYYMMDD>-<seq>, e.g. "CASH-20260828-014" — the date is the
 * payment's own paymentDate/transactionDate (when it was actually collected), not
 * "now", so a backdated entry groups with that day's collections rather than today's.
 * The sequence counts existing references matching that same mode+date prefix across
 * BOTH payment tables (sale_payment_requests and payment_transactions — the two
 * separate collection pipelines in this app, see recordPayment's and
 * createSalePaymentRequest's own comments), so a same-day Cash collection recorded
 * through either one never collides with the other.
 *
 * Count-based, not a real atomic sequence — mirrors generateSalePaymentRequestNo's own
 * approach (the existing convention for these display identifiers, e.g. SPAY-2026-0016
 * — not a uniqueness-critical key, so no retry-on-collision is needed here either).
 */
export async function generatePaymentReference(
  paymentMode: string | undefined,
  paymentDate: Date,
): Promise<string | undefined> {
  const prefix = REFERENCE_MODE_PREFIX[(paymentMode || '').toUpperCase()];
  if (!prefix) return undefined;

  const dateStr = paymentDate.toISOString().split('T')[0].replace(/-/g, '');
  const likePattern = `${prefix}-${dateStr}-%`;

  const [requestCount, transactionCount] = await Promise.all([
    Source.getRepository(SalePaymentRequest)
      .createQueryBuilder('r')
      .where('r."referenceNumber" LIKE :p', { p: likePattern })
      .getCount(),
    // PaymentTransaction's DB columns are explicit snake_case (see
    // paymentTransactionEntity.ts) — unlike SalePaymentRequest above, which is camelCase.
    Source.getRepository(PaymentTransaction)
      .createQueryBuilder('t')
      .where('t."reference_number" LIKE :p', { p: likePattern })
      .getCount(),
  ]);

  const seq = String(requestCount + transactionCount + 1).padStart(3, '0');
  return `${prefix}-${dateStr}-${seq}`;
}
