import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

export const getFallbackBranchId = async (): Promise<string | undefined> => {
  try {
    const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
    const token = jwt.sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const response = await fetch(`${inventoryServiceUrl}/branch`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const result = await response.json();
      const branches = result.data;
      if (Array.isArray(branches) && branches.length > 0) {
        return branches[0].id;
      }
    }
  } catch (err) {
    logger.error('Failed to fetch fallback branch ID from inventory service:', err);
  }

  // Fallback to querying invoices from our own DB if inventory service call fails
  try {
    const { Source } = await import('../config/dataSource');
    const { Invoice } = await import('../entities/invoiceEntity');
    const invoiceRepo = Source.getRepository(Invoice);
    const firstInvoice = await invoiceRepo.findOne({
      select: ['branchId'],
      where: {},
    });
    if (firstInvoice?.branchId) {
      return firstInvoice.branchId;
    }
  } catch (err) {
    logger.error('Failed to fetch fallback branch ID from invoices:', err);
  }

  return undefined;
};
