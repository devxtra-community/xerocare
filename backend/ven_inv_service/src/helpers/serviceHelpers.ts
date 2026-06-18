import axios from 'axios';
import { sign } from 'jsonwebtoken';

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
const ACCESS_SECRET = process.env.ACCESS_SECRET || 'secret';

interface HelperEmployee {
  id: string;
  branch_id: string;
}

export async function getFinanceEmployeesByBranch(branchId: string | undefined): Promise<string[]> {
  if (!branchId) return [];
  try {
    const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
      expiresIn: '1m',
    });

    const response = await axios.get(`${EMPLOYEE_SERVICE_URL}/employee?role=FINANCE&limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const employees: HelperEmployee[] = response.data?.data?.employees || [];
    return employees
      .filter((emp: HelperEmployee) => emp.branch_id === branchId)
      .map((emp: HelperEmployee) => emp.id);
  } catch (err) {
    console.error('Error fetching finance employees:', err);
    return [];
  }
}

export async function getCustomerName(customerId: string | undefined): Promise<string> {
  if (!customerId) return 'Customer';
  try {
    const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
      expiresIn: '1m',
    });

    const response = await axios.get(`${CRM_SERVICE_URL}/customers/${customerId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const customer = response.data?.data;
    if (customer) {
      return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
    }
    return 'Customer';
  } catch (err) {
    console.error('Error fetching customer name:', err);
    return 'Customer';
  }
}

export async function getHelpDeskEmployeesByBranch(
  branchId: string | undefined,
): Promise<string[]> {
  if (!branchId) return [];
  try {
    const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
      expiresIn: '1m',
    });

    const response = await axios.get(
      `${EMPLOYEE_SERVICE_URL}/employee?role=EMPLOYEE&job=SERVICE_HELP_DESK&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const employees: HelperEmployee[] = response.data?.data?.employees || [];
    return employees
      .filter((emp: HelperEmployee) => emp.branch_id === branchId)
      .map((emp: HelperEmployee) => emp.id);
  } catch (err) {
    console.error('Error fetching helpdesk employees:', err);
    return [];
  }
}
