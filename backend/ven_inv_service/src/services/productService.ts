import { AddProductDTO, BulkProductRow } from '../dto/product.dto';
import { AppError } from '../errors/appError';
import { ProductRepository } from '../repositories/productRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { ModelService } from './modelService';
import { WarehouseRepository } from '../repositories/warehouseRepository';
import { Product } from '../entities/productEntity';
import { logger } from '../config/logger';
import { LotService } from './lotService';
import { LotItemType } from '../entities/lotItemEntity';
import { getCached, setCached, deleteCached, getMultipleCached } from '../utils/cacheUtil';

export class ProductService {
  private productRepo = new ProductRepository();
  private model = new ModelRepository();
  private warehouse = new WarehouseRepository();
  private modelService = new ModelService();
  private lotService = new LotService();

  private validateDiscount(salePrice: number, maxDiscount?: number) {
    if (maxDiscount !== undefined) {
      if (maxDiscount < 0) {
        throw new AppError('Maximum discount amount cannot be negative', 400);
      }
      if (maxDiscount > salePrice) {
        throw new AppError('Maximum discount amount cannot exceed sale price', 400);
      }
    }
  }

  async bulkCreateProducts(rows: BulkProductRow[]) {
    const success: string[] = [];
    const failed: { row: number; error: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.vendor_id) {
          throw new AppError('vendor_id missing', 400);
        }

        // Validate discount
        const maxDiscount = row.max_discount_amount ?? 0;
        this.validateDiscount(row.sale_price, maxDiscount);

        const modelDetails = await this.model.findbyid(row.model_no);
        if (!modelDetails) {
          throw new AppError('model not found', 404);
        }
        const warehouseDetails = await this.warehouse.findById(row.warehouse_id);
        if (!warehouseDetails) {
          throw new AppError('warehouse not found ', 404);
        }

        // Check Lot Usage if lot_id provided
        if (row.lot_id) {
          await this.lotService.validateAndTrackUsage(
            row.lot_id,
            LotItemType.MODEL,
            row.model_no, // assuming model_no is model_id or mapped correctly? Wait.
            // row.model_no in bulk might be model_no string or UUID?
            // ProductService.ts:39 uses this.model.findbyid(row.model_no).
            // So row.model_no is treated as ID.
            1,
          );
        }

        await this.model.updateModel(modelDetails.id, { quantity: modelDetails.quantity + 1 });
        const product = await this.productRepo.addProduct({
          vendor_id: String(row.vendor_id),
          serial_no: row.serial_no,
          name: row.name,
          brand: row.brand,
          MFD: new Date(row.MFD),
          sale_price: row.sale_price,
          tax_rate: row.tax_rate,
          model: modelDetails,
          warehouse: warehouseDetails,
          product_status: row.product_status,
          print_colour: row.print_colour,
          max_discount_amount: maxDiscount,
          lot_id: row.lot_id,
        });

        // Pre-warm cache for newly created product
        await setCached(`product:${product.id}`, product, 3600);

        // Sync Model Quantity to Redis
        await this.modelService.syncToRedis(modelDetails.id);

        success.push(row.serial_no);
      } catch (error: unknown) {
        logger.error(`Bulk insert error at row ${i + 1}`, error);

        if (error instanceof Error) {
          failed.push({
            row: i + 1,
            error: error.message,
          });
        } else {
          failed.push({
            row: i + 1,
            error: 'Unknown error',
          });
        }
      }
    }
    return { success, failed };
  }

  async addProduct(data: AddProductDTO) {
    try {
      // Validate discount
      const maxDiscount = data.max_discount_amount ?? 0;
      this.validateDiscount(data.sale_price, maxDiscount);

      const modelDetails = await this.model.findbyid(data.model_id);
      if (!modelDetails) {
        throw new AppError('model not found', 404);
      }

      // Check Lot Usage if lot_id provided
      if (data.lot_id) {
        await this.lotService.validateAndTrackUsage(
          data.lot_id,
          LotItemType.MODEL,
          data.model_id,
          1, // One product instance
        );
      }

      const warehouseDetails = await this.warehouse.findById(data.warehouse_id);
      if (!warehouseDetails) {
        throw new AppError('warehouse not found ', 404);
      }
      await this.model.updateModel(modelDetails.id, { quantity: modelDetails.quantity + 1 });
      const product = await this.productRepo.addProduct({
        vendor_id: String(data.vendor_id),
        serial_no: data.serial_no,
        name: data.name,
        brand: modelDetails.brandRelation?.name || data.brand,
        MFD: new Date(data.MFD),
        sale_price: data.sale_price,
        tax_rate: data.tax_rate,
        model: modelDetails,
        warehouse: warehouseDetails,
        product_status: data.product_status,
        print_colour: data.print_colour,
        max_discount_amount: maxDiscount,
        imageUrl: data.imageUrl,
        lot_id: data.lot_id,
      });

      // Pre-warm cache for newly created product
      await setCached(`product:${product.id}`, product, 3600);

      // Sync Model Quantity to Redis
      await this.modelService.syncToRedis(modelDetails.id);

      return product;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      logger.error('Failed to add product service error:', err);
      throw new AppError('Failed to add product', 500);
    }
  }

  async deleteProduct(id: string) {
    const product = await this.productRepo.findOne(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    const modelDetails = await this.model.findbyid(product.model_id);
    if (modelDetails) {
      await this.model.updateModel(modelDetails.id, { quantity: modelDetails.quantity - 1 });
    }

    // Invalidate cache
    await deleteCached(`product:${id}`);

    // Sync Model Quantity to Redis
    if (product.model_id) {
      await this.modelService.syncToRedis(product.model_id);
    }

    return this.productRepo.deleteProduct(id);
  }

  async getAllProducts() {
    return this.productRepo.getAllProducts();
  }

  async updateProduct(id: string, data: Partial<Product>) {
    // If validation fields are present, we need to check constraints
    if (data.max_discount_amount !== undefined || data.sale_price !== undefined) {
      const currentProduct = await this.productRepo.findOne(id);
      if (!currentProduct) {
        throw new AppError('Product not found', 404);
      }

      const newSalePrice = data.sale_price ?? currentProduct.sale_price;
      const newMaxDiscount = data.max_discount_amount ?? currentProduct.max_discount_amount;

      this.validateDiscount(Number(newSalePrice), Number(newMaxDiscount));
    }

    const updated = await this.productRepo.updateProduct(id, data);

    // Invalidate cache after update
    await deleteCached(`product:${id}`);

    // Sync Model Quantity using the existing product's model_id
    // If model_id changed (unlikely for updateProduct?), we should sync both.
    // For now, assuming model_id doesn't change or we fetch product.
    // updateProduct in repo updates specific fields.
    const updatedProduct = await this.findOne(id);
    if (updatedProduct && updatedProduct.model_id) {
      await this.modelService.syncToRedis(updatedProduct.model_id);
    }

    return updated;
  }

  async findOne(id: string) {
    // Try cache first (cache-aside pattern)
    const cacheKey = `product:${id}`;
    const cached = await getCached<Product>(cacheKey);

    if (cached) {
      logger.debug(`Cache HIT for product: ${id}`);
      return cached;
    }

    // Cache miss - fetch from database
    logger.debug(`Cache MISS for product: ${id}`);
    const product = await this.productRepo.findOne(id);

    if (product) {
      // Store in cache for future requests
      await setCached(cacheKey, product, 3600); // 1 hour TTL
    }

    return product;
  }

  /**
   * Batch fetch products with caching optimization
   * Used by billing service to fetch multiple products efficiently
   */
  async findByIds(ids: string[]): Promise<Product[]> {
    const results: Product[] = [];
    const missingIds: string[] = [];

    // Generate cache keys
    const cacheKeys = ids.map((id) => `product:${id}`);

    // Try to get all from cache
    const cachedMap = await getMultipleCached<Product>(cacheKeys);

    ids.forEach((id, index) => {
      const cached = cachedMap.get(cacheKeys[index]);
      if (cached) {
        results.push(cached);
      } else {
        missingIds.push(id);
      }
    });

    logger.debug(`Cache: ${results.length} hits, ${missingIds.length} misses`);

    // Fetch missing products from database
    if (missingIds.length > 0) {
      const products = await this.productRepo.findByIds(missingIds);

      // Cache the fetched products
      await Promise.all(products.map((p) => setCached(`product:${p.id}`, p, 3600)));

      results.push(...products);
    }

    return results;
  }
}
