import { Request, Response } from 'express';
import { purchaseService } from '../services/purchaseService';

export class PurchaseController {
  async getAllPurchases(req: Request, res: Response) {
    try {
      const purchases = await purchaseService.getAllPurchases();
      res.json(purchases);
    } catch {
      res.status(500).json({ error: 'Failed to fetch purchases' });
    }
  }
}

export const purchaseController = new PurchaseController();
