import { Source } from '../config/db';
import { Product } from '../entities/productEntity';

async function checkProductStats() {
  try {
    await Source.initialize();
    const productRepo = Source.getRepository(Product);
    const stats = await productRepo
      .createQueryBuilder('product')
      .select('product.product_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('product.product_status')
      .getRawMany();

    console.log('Product Status Stats:', stats);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await Source.destroy();
  }
}

checkProductStats();
