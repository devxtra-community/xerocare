import { Source } from '../config/db';
import { Purchase } from '../entities/purchaseEntity';

export class PurchaseService {
  private purchaseRepo = Source.getRepository(Purchase);

  async getAllPurchases() {
    return await this.purchaseRepo.find();
  }
}

export const purchaseService = new PurchaseService();
