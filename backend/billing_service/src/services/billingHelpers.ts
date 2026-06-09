import { sign } from 'jsonwebtoken';
import { Invoice } from '../entities/invoiceEntity';
import { SaleType } from '../entities/enums/saleType';

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

    const response = await fetch(`${employeeServiceUrl}/employees/${employeeId}`, {
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

    const response = await fetch(`${employeeServiceUrl}/employees?role=FINANCE&limit=100`, {
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

    const response = await fetch(`${employeeServiceUrl}/employees?role=MANAGER&limit=100`, {
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

    const response = await fetch(`${employeeServiceUrl}/employees?role=MANAGER&limit=100`, {
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
