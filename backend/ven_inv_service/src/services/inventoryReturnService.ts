import { ProductStatus } from '../entities/productEntity';
import { AppError } from '../errors/appError';
import { Source } from '../config/db';
import { Product } from '../entities/productEntity';
import { SparePart } from '../entities/sparePartEntity';

export class InventoryReturnService {
  /**
   * Processes the return of an inventory item (Product or Spare Part).
   * @param itemType 'PRODUCT' | 'SPARE_PART'
   * @param itemId id of the item
   * @param quantity used for spare parts (assumed 1 for products)
   */
  async processReturn(itemType: 'PRODUCT' | 'SPARE_PART', itemId: string, quantity: number = 1) {
    if (itemType === 'PRODUCT') {
      const productRepo = Source.getRepository(Product);
      const product = await productRepo.findOne({ where: { id: itemId } });
      if (!product) {
        throw new AppError('Product not found', 404);
      }
      product.product_status = ProductStatus.AVAILABLE;
      await productRepo.save(product);
      return { success: true, message: 'Product returned and marked as fully available.' };
    } else if (itemType === 'SPARE_PART') {
      const sparePartRepo = Source.getRepository(SparePart);
      const sparePart = await sparePartRepo.findOne({ where: { id: itemId } });
      if (!sparePart) {
        throw new AppError('Spare part not found', 404);
      }
      sparePart.quantity += quantity;
      await sparePartRepo.save(sparePart);
      return { success: true, message: 'Spare part quantity incremented successfully.' };
    } else {
      throw new AppError('Invalid itemType provided', 400);
    }
  }
}
