import jwt from 'jsonwebtoken';
import axios from 'axios';
import { logger } from '../config/logger';

export const getFallbackBranchId = async (): Promise<string | undefined> => {
  try {
    const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
    const token = jwt.sign(
      { userId: 'api_gateway', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const response = await axios.get(`${inventoryServiceUrl}/branch`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const branches = response.data?.data;
    if (Array.isArray(branches) && branches.length > 0) {
      return branches[0].id;
    }
  } catch (err) {
    logger.error('Failed to fetch fallback branch ID from inventory service in gateway:', err);
  }

  return undefined;
};
