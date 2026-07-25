import { NextFunction, Request, Response } from 'express';
import { purchaseService } from '../services/purchaseService';
import { AppError } from '../errors/appError';
import { Source } from '../config/db';

export class PurchaseController {
  async getAllPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = req.user?.branchId;
      const isAdmin = req.user?.role === 'ADMIN';
      // Explicit ?branchId= always wins — used by billing_service's internal
      // cross-service calls (e.g. Payable charts), which self-sign an ADMIN token
      // to reach this route but still need to stay scoped to one real branch rather
      // than getting every branch's purchases back.
      const queryBranchId = req.query.branchId as string | undefined;
      const filteredBranchId = queryBranchId || (isAdmin ? undefined : branchId);

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

      const receiptFile = req.file as unknown as { location?: string } | undefined;

      const paymentData = {
        ...req.body,
        createdBy: req.user?.userId,
        attachmentUrl: receiptFile?.location,
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

      const queryParams: string[] = [];
      let paramIdx = 1;

      let dateFromClause = '';
      if (dateFrom) {
        dateFromClause = `AND p.created_at::date >= $${paramIdx++}::date`;
        queryParams.push(dateFrom);
      }
      let dateToClause = '';
      if (dateTo) {
        dateToClause = `AND p.created_at::date <= $${paramIdx++}::date`;
        queryParams.push(dateTo);
      }

      // Group by currency so Billing can apply per-currency exchange-rate conversion.
      // Four non-overlapping buckets that sum to exactly purchase_amount + documentation_fee
      // + labour_cost + handling_fee + transportation_cost + shipping_cost + groundfield_cost
      // (== total_amount) plus customs_duty (tracked separately, never part of total_amount):
      //   5004 purchase_cost      = purchase_amount + documentation_fee
      //   5005 shipping_handling  = shipping_cost + handling_fee + transportation_cost + groundfield_cost
      //   5014 import_labour_cost = labour_cost (import/purchase labour — distinct from 5002 Technician Labour)
      //   5015 customs_duty       = customs_duty (expensed directly, not capitalized into inventory)
      const rows = await Source.query<
        {
          currency_code: string | null;
          purchase_cost: string;
          shipping_handling: string;
          import_labour_cost: string;
          customs_duty: string;
          input_vat_amount: string;
          reverse_charge_vat_amount: string;
        }[]
      >(
        `
        SELECT
          COALESCE(p.currency_code, 'AED') AS currency_code,
          COALESCE(SUM(p.purchase_amount + p.documentation_fee), 0) AS purchase_cost,
          COALESCE(SUM(p.shipping_cost + p.handling_fee + p.transportation_cost + p.groundfield_cost), 0) AS shipping_handling,
          COALESCE(SUM(p.labour_cost), 0) AS import_labour_cost,
          COALESCE(SUM(p.customs_duty), 0) AS customs_duty,
          COALESCE(SUM(p.input_vat_amount) FILTER (WHERE p.vat_claimable IS NOT FALSE), 0) AS input_vat_amount,
          COALESCE(SUM(p.reverse_charge_vat_amount) FILTER (WHERE p.vat_claimable IS NOT FALSE), 0) AS reverse_charge_vat_amount
        FROM purchases p
        WHERE 1=1
          ${branchClause}
          ${dateFromClause}
          ${dateToClause}
        GROUP BY p.currency_code
      `,
        queryParams,
      );

      // Billing service will do the currency conversion.
      // We just return the per-currency breakdown plus a flat total for callers
      // that don't need conversion (same-currency branches).
      // inputVatAmount/reverseChargeVatAmount only include vat_claimable purchases —
      // non-claimable input VAT (e.g. blocked categories under some jurisdictions'
      // VAT rules) must never reduce VAT Payable, since it can't actually be reclaimed.
      const currencyGroups = rows.map((r) => ({
        currencyCode: r.currency_code ?? 'AED',
        purchaseCost: Number(r.purchase_cost),
        shippingHandling: Number(r.shipping_handling),
        importLabourCost: Number(r.import_labour_cost),
        customsDuty: Number(r.customs_duty),
        inputVatAmount: Number(r.input_vat_amount),
        reverseChargeVatAmount: Number(r.reverse_charge_vat_amount),
      }));

      return res.json({ success: true, currencyGroups });
    } catch (err) {
      next(err);
    }
  }

  // Internal endpoint called by Billing service's Balance Sheet — outstanding vendor
  // purchases (total_amount - paid), per currency, for purchases not yet fully paid.
  // Mirrors getPurchaseCostReport's shape/pattern above.
  async getPayableSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchIds } = req.query as Record<string, string>;

      let branchClause = '';
      if (branchIds) {
        const ids = branchIds.split(',').filter((b) => /^[0-9a-f-]{36}$/i.test(b));
        if (ids.length === 1) branchClause = `AND p.branch_id = '${ids[0]}'`;
        else if (ids.length > 1)
          branchClause = `AND p.branch_id IN (${ids.map((b) => `'${b}'`).join(',')})`;
      }

      const rows = await Source.query<{ currency_code: string | null; outstanding: string }[]>(`
        SELECT COALESCE(p.currency_code, 'AED') AS currency_code,
               COALESCE(SUM(p.total_amount - COALESCE(pay.paid, 0)), 0) AS outstanding
        FROM purchases p
        LEFT JOIN (
          SELECT purchase_id, SUM(amount) AS paid FROM purchase_payments GROUP BY purchase_id
        ) pay ON pay.purchase_id = p.id
        WHERE (p.total_amount - COALESCE(pay.paid, 0)) > 0
          ${branchClause}
        GROUP BY p.currency_code
      `);

      const currencyGroups = rows.map((r) => ({
        currencyCode: r.currency_code ?? 'AED',
        outstanding: Number(r.outstanding),
      }));

      return res.json({ success: true, currencyGroups });
    } catch (err) {
      next(err);
    }
  }

  // Internal: billing_service calls this when Finance approves a Manager purchase payment request.
  // Records the PurchasePayment without firing the billing notification callback (avoids circular call).
  async recordPaymentInternal(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.headers['x-internal-service'] !== 'billing') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const {
        purchaseId,
        branchId,
        amount,
        paymentMethod,
        description,
        referenceNumber,
        paymentDate,
        createdBy,
        attachmentUrl,
      } = req.body;
      if (!purchaseId || !branchId || !amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'purchaseId, branchId, amount, paymentMethod are required',
        });
      }
      const payment = await purchaseService.recordPaymentInternalOnly(
        purchaseId,
        {
          amount: Number(amount),
          paymentMethod,
          description,
          referenceNumber,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          createdBy,
          attachmentUrl,
        },
        branchId,
      );
      // Include the purchase's origin (DOMESTIC/INTERNATIONAL) so the billing
      // approval-queue record can snapshot it for Finance visibility.
      let purchaseOrigin: string | undefined;
      try {
        const purchase = await purchaseService.getPurchaseById(purchaseId, branchId);
        purchaseOrigin = (purchase as { purchaseOrigin?: string } | null)?.purchaseOrigin;
      } catch {
        /* origin enrichment is best-effort */
      }
      return res.status(201).json({ success: true, data: { ...payment, purchaseOrigin } });
    } catch (err) {
      next(err);
    }
  }

  // Internal: billing_service calls this when Finance rejects a Manager purchase payment request.
  // Deletes the PurchasePayment so the outstanding balance is restored.
  async voidPaymentInternal(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.headers['x-internal-service'] !== 'billing') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const { paymentId, branchId } = req.body;
      if (!paymentId || !branchId) {
        return res
          .status(400)
          .json({ success: false, message: 'paymentId and branchId are required' });
      }
      await purchaseService.voidPayment(paymentId, branchId);
      return res.json({ success: true, message: 'Payment voided' });
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
