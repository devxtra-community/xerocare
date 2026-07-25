import { Request, Response, NextFunction } from 'express';

/**
 * Gate for service-to-service routes with no per-user JWT to check (cron jobs,
 * background lease/allocation lookups). Mirrors the x-internal-service
 * convention already used in expenseRequestController.ts / purchaseController.ts
 * rather than introducing a second scheme.
 */
const ALLOWED_CALLERS = new Set(['ven-inv']);

export const internalServiceAuth = (req: Request, res: Response, next: NextFunction) => {
  const caller = req.headers['x-internal-service'];
  if (typeof caller !== 'string' || !ALLOWED_CALLERS.has(caller)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};
