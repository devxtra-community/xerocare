import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getInventoryNavCounts } from '../services/navCountsService';
import { logger } from '../config/logger';

const router = Router();

/**
 * Sidebar badge counts for this service's queues. Called by the gateway's aggregator,
 * never by the browser directly.
 *
 * Returns an empty map rather than an error when there is no branch context or the query
 * fails — a badge must never be the reason a sidebar breaks.
 */
router.get('/nav-counts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role || '';
    const branchId = req.user?.branchId || (req.query.branchId as string) || '';
    if (!branchId && role !== 'ADMIN') {
      return res.json({ success: true, data: {} });
    }
    const data = await getInventoryNavCounts(branchId, role);
    return res.json({ success: true, data });
  } catch (err) {
    logger.error('nav-counts error', err);
    return res.json({ success: true, data: {} });
  }
});

export default router;
