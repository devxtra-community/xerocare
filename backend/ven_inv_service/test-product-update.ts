import { Source } from './src/config/db';
import { Product, ProductStatus } from './src/entities/productEntity';
import { logger } from './src/config/logger';

async function testProductStatusUpdate() {
  try {
    // Initialize database
    await Source.initialize();
    logger.info('Database connected');

    const productRepo = Source.getRepository(Product);

    // Get the first available product
    const product = await productRepo.findOne({
      where: { product_status: ProductStatus.AVAILABLE },
    });

    if (!product) {
      logger.error('No AVAILABLE product found to test');
      process.exit(1);
    }

    logger.info('Found product to test', {
      id: product.id,
      serial_no: product.serial_no,
      currentStatus: product.product_status,
    });

    // Update status to RENTED
    product.product_status = ProductStatus.RENTED;
    const savedProduct = await productRepo.save(product);

    logger.info('Product status updated', {
      id: savedProduct.id,
      serial_no: savedProduct.serial_no,
      newStatus: savedProduct.product_status,
    });

    // Verify the update
    const verifyProduct = await productRepo.findOne({
      where: { id: product.id },
    });

    logger.info('Verification', {
      id: verifyProduct?.id,
      status: verifyProduct?.product_status,
      success: verifyProduct?.product_status === ProductStatus.RENTED,
    });

    process.exit(0);
  } catch (error) {
    logger.error('Test failed', error);
    process.exit(1);
  }
}

testProductStatusUpdate();
