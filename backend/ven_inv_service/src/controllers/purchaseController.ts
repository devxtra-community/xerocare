import { NextFunction, Request, Response } from 'express';
import { purchaseService } from '../services/purchaseService';
import { AppError } from '../errors/appError';
import { Source } from '../config/db';

export class PurchaseController {
  async getAllPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const purchases = await purchaseService.getAllPurchases(filteredBranchId);
      res.status(200).json({ success: true, data: purchases });
    } catch (err) {
      next(err);
    }
  }

  async getSpendByOrigin(req: Request, res: Response, next: NextFunction) {
    try {
      const userBranchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';

      // Admins may filter by any branch; non-admins are locked to their own branch.
      const requestedBranchId = req.query.branchId ? String(req.query.branchId) : undefined;
      const branchId = isAdmin ? requestedBranchId : userBranchId;

      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

      const summary = await purchaseService.getSpendByOrigin({ branchId, startDate, endDate });
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  async getPurchaseByLotId(req: Request, res: Response, next: NextFunction) {
    try {
      const lotId = String(req.params.lotId);
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const purchase = await purchaseService.getPurchaseByLotId(lotId, filteredBranchId);
      if (!purchase) {
        return res.status(200).json({ success: true, data: null });
      }
      res.status(200).json({ success: true, data: purchase });
    } catch (err) {
      next(err);
    }
  }

  async getPurchaseById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const purchase = await purchaseService.getPurchaseById(id, filteredBranchId);
      if (!purchase) {
        return res.status(404).json({ success: false, message: 'Purchase not found' });
      }
      res.status(200).json({ success: true, data: purchase });
    } catch (err) {
      next(err);
    }
  }

  async addPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const branchId = req.user?.branchId;
      if (!branchId) throw new AppError('Branch ID is required', 400);

      const paymentData = {
        ...req.body,
        createdBy: req.user?.userId,
      };

      const payment = await purchaseService.addPayment(id, paymentData, branchId);
      res.status(201).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }

  async addCost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const branchId = req.user?.branchId;
      if (!branchId) throw new AppError('Branch ID is required', 400);

      const costData = {
        ...req.body,
        createdBy: req.user?.userId,
      };

      const cost = await purchaseService.addCost(id, costData, branchId);
      res.status(201).json({ success: true, data: cost });
    } catch (err) {
      next(err);
    }
  }

  async updatePurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      const filteredBranchId = isAdmin ? undefined : branchId;

      const purchase = await purchaseService.updatePurchase(id, req.body, filteredBranchId);
      res.status(200).json({ success: true, data: purchase });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Internal endpoint for Billing service.
   * Returns purchase cost (items + labour + docs) and shipping/handling totals
   * for the given period and branch(es), with per-currency grouping so Billing
   * can apply exchange-rate conversion.
   *
   * 5004 = purchaseAmount + labourCost + documentationFee  (cost of goods acquired)
   * 5005 = shippingCost + handlingFee + transportationCost + groundfieldCost (logistics)
   *
   * Note: total_amount is NOT used here because it combines both buckets;
   * splitting prevents double-counting when Billing reports 5004 and 5005 separately.
   */
  async getPurchaseCostReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchIds, dateFrom, dateTo } = req.query as Record<string, string>;

      let branchClause = '';
      if (branchIds) {
        const ids = branchIds.split(',').filter((b) => /^[0-9a-f-]{36}$/i.test(b));
        if (ids.length === 1) branchClause = `AND p.branch_id = '${ids[0]}'`;
        else if (ids.length > 1)
          branchClause = `AND p.branch_id IN (${ids.map((b) => `'${b}'`).join(',')})`;
      }
      const dateFromClause = dateFrom ? `AND p.created_at::date >= '${dateFrom}'` : '';
      const dateToClause = dateTo ? `AND p.created_at::date <= '${dateTo}'` : '';

      // Group by currency so Billing can apply per-currency exchange-rate conversion
      const rows = await Source.query<
        {
          currency_code: string | null;
          purchase_cost: string;
          shipping_handling: string;
        }[]
      >(`
        SELECT
          COALESCE(p.currency_code, 'AED') AS currency_code,
          COALESCE(SUM(p.purchase_amount + p.labour_cost + p.documentation_fee), 0) AS purchase_cost,
          COALESCE(SUM(p.shipping_cost + p.handling_fee + p.transportation_cost + p.groundfield_cost), 0) AS shipping_handling
        FROM purchases p
        WHERE 1=1
          ${branchClause}
          ${dateFromClause}
          ${dateToClause}
        GROUP BY p.currency_code
      `);

      // Billing service will do the currency conversion.
      // We just return the per-currency breakdown plus a flat total for callers
      // that don't need conversion (same-currency branches).
      const currencyGroups = rows.map((r) => ({
        currencyCode: r.currency_code ?? 'AED',
        purchaseCost: Number(r.purchase_cost),
        shippingHandling: Number(r.shipping_handling),
      }));

      return res.json({ success: true, currencyGroups });
    } catch (err) {
      next(err);
    }
  }

  // P2-1: Batch existence check — given a list of purchase IDs, returns which ones exist.
  // Used by billing-service nightly reconciliation to detect orphaned linked_po_id entries.
  async batchExistsPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body as { ids?: string[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.json({ success: true, existingIds: [] });
      }
      const uuidRe = /^[0-9a-f-]{36}$/i;
      const safeIds = ids.filter((id) => uuidRe.test(id));
      if (safeIds.length === 0) {
        return res.json({ success: true, existingIds: [] });
      }
      const placeholders = safeIds.map((_, i) => `$${i + 1}`).join(',');
      const rows = await Source.query<{ id: string }[]>(
        `SELECT id FROM purchases WHERE id IN (${placeholders})`,
        safeIds,
      );
      const existingIds = rows.map((r: { id: string }) => r.id);
      return res.json({ success: true, existingIds });
    } catch (err) {
      next(err);
    }
  }
}

export const purchaseController = new PurchaseController();
