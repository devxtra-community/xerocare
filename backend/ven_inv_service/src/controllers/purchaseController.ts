import { NextFunction, Request, Response } from 'express';
import { purchaseService } from '../services/purchaseService';
import { AppError } from '../errors/appError';

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
}

export const purchaseController = new PurchaseController();
