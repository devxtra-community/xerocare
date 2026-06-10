import { Source } from '../config/db';
import { logger } from '../config/logger';
import { Product, ProductStatus } from '../entities/productEntity';
import { SparePart } from '../entities/sparePartEntity';

async function fixInventory() {
  try {
    logger.info('Initializing database connection for ven_inv service...');
    await Source.initialize();
    logger.info('Database connected.');

    const productRepo = Source.getRepository(Product);
    const sparePartRepo = Source.getRepository(SparePart);

    logger.info('Resetting all products to AVAILABLE status...');
    const productUpdate = await productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ product_status: ProductStatus.AVAILABLE })
      .execute();
    logger.info(`Updated ${productUpdate.affected} products.`);

    logger.info('Ensuring spare parts have quantity...');
    // Only update if quantity is 0
    const sparePartUpdate = await sparePartRepo
      .createQueryBuilder()
      .update(SparePart)
      .set({ quantity: 100 })
      .where('quantity = 0')
      .execute();
    logger.info(`Updated ${sparePartUpdate.affected} spare parts quantity.`);

    logger.info('Inventory fix completed.');
  } catch (err) {
    logger.error('Error fixing inventory:', err);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

fixInventory();
