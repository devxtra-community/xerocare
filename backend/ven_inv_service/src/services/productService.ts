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

/**
 * Safely parses an MFD value which may be a Date, ISO string, or Excel serial number.
 * Excel stores dates as days since Dec 30, 1899.
 */
function parseMFD(value: string | Date | number | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const num = Number(value);
  // Excel serial date: a number > 1000 that isn't a Unix timestamp
  if (!isNaN(num) && num > 1000 && num < 200000) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + num * 86400000);
  }
  return new Date(value as string);
}

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

  /**
   * Creates multiple products in bulk, reporting successes and failures.
   */
  async bulkCreateProducts(rows: BulkProductRow[]) {
    const success: string[] = [];
    const failed: { row: number; error: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.vendor_id) {
          throw new AppError('vendor_id missing', 400);
        }

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

        if (row.lot_id) {
          await this.lotService.validateAndTrackUsage(
            row.lot_id,
            LotItemType.MODEL,
            row.model_no,
            1,
          );
        }

        const product = await this.productRepo.addProduct({
          vendor_id: String(row.vendor_id),
          serial_no: row.serial_no,
          name: row.name,
          brand: row.brand,
          MFD: parseMFD(row.MFD),
          sale_price: row.sale_price,
          tax_rate: row.tax_rate,
          model: modelDetails,
          warehouse: warehouseDetails,
          product_status: row.product_status,
          print_colour: row.print_colour,
          max_discount_amount: maxDiscount,
          lot_id: row.lot_id,
        });

        await this.model.syncModelQuantities(modelDetails.id);

        await setCached(`product:${product.id}`, product, 3600);

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

  /**
   * Adds a new product, updating model quantities and Lot usage.
   */
  async addProduct(data: AddProductDTO) {
    try {
      const maxDiscount = data.max_discount_amount ?? 0;
      this.validateDiscount(data.sale_price, maxDiscount);

      const modelDetails = await this.model.findbyid(data.model_id);
      if (!modelDetails) {
        throw new AppError('model not found', 404);
      }

      if (data.lot_id) {
        await this.lotService.validateAndTrackUsage(
          data.lot_id,
          LotItemType.MODEL,
          data.model_id,
          1,
        );
      }

      const warehouseDetails = await this.warehouse.findById(data.warehouse_id);
      if (!warehouseDetails) {
        throw new AppError('warehouse not found ', 404);
      }
      const product = await this.productRepo.addProduct({
        vendor_id: String(data.vendor_id),
        serial_no: data.serial_no,
        name: data.name,
        brand: modelDetails.brandRelation?.name || data.brand,
        MFD: parseMFD(data.MFD),
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

      await this.model.syncModelQuantities(modelDetails.id);

      await setCached(`product:${product.id}`, product, 3600);

      await this.modelService.syncToRedis(modelDetails.id);

      return product;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      logger.error('Failed to add product service error:', err);
      throw new AppError('Failed to add product', 500);
    }
  }

  /**
   * Deletes a product and updates model quantities.
   */
  async deleteProduct(id: string) {
    const product = await this.productRepo.findOne(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    await deleteCached(`product:${id}`);

    const result = await this.productRepo.deleteProduct(id);

    if (product.model_id) {
      await this.model.syncModelQuantities(product.model_id);
      await this.modelService.syncToRedis(product.model_id);
    }

    return result;
  }

  /**
   * Retrieves all products.
   */
  async getAllProducts() {
    return this.productRepo.getAllProducts();
  }

  /**
   * Updates a product and clears relevant caches.
   */
  async updateProduct(id: string, data: Partial<Product>) {
    const currentProduct = await this.productRepo.findOne(id);
    if (!currentProduct) {
      throw new AppError('Product not found', 404);
    }

    if (data.max_discount_amount !== undefined || data.sale_price !== undefined) {
      const newSalePrice = data.sale_price ?? currentProduct.sale_price;
      const newMaxDiscount = data.max_discount_amount ?? currentProduct.max_discount_amount;

      this.validateDiscount(Number(newSalePrice), Number(newMaxDiscount));
    }

    const oldModelId = currentProduct.model_id;

    const updated = await this.productRepo.updateProduct(id, data);

    await deleteCached(`product:${id}`);

    const updatedProduct = await this.findOne(id);
    if (updatedProduct && updatedProduct.model_id) {
      await this.model.syncModelQuantities(updatedProduct.model_id);
      await this.modelService.syncToRedis(updatedProduct.model_id);

      // If the model was changed during update, sync the old model's quantities too
      if (oldModelId && oldModelId !== updatedProduct.model_id) {
        await this.model.syncModelQuantities(oldModelId);
        await this.modelService.syncToRedis(oldModelId);
      }
    }

    return updated;
  }

  /**
   * Finds a product by ID, utilizing cache.
   */
  async findOne(id: string) {
    const cacheKey = `product:${id}`;
    const cached = await getCached<Product>(cacheKey);

    if (cached) {
      logger.debug(`Cache HIT for product: ${id}`);
      return cached;
    }

    logger.debug(`Cache MISS for product: ${id}`);
    const product = await this.productRepo.findOne(id);

    if (product) {
      await setCached(cacheKey, product, 3600);
    }

    return product;
  }

  /**
   * Finds multiple products by their IDs, using cache where available.
   */
  async findByIds(ids: string[]): Promise<Product[]> {
    const results: Product[] = [];
    const missingIds: string[] = [];

    const cacheKeys = ids.map((id) => `product:${id}`);

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

    if (missingIds.length > 0) {
      const products = await this.productRepo.findByIds(missingIds);

      await Promise.all(products.map((p) => setCached(`product:${p.id}`, p, 3600)));

      results.push(...products);
    }

    return results;
  }
}
