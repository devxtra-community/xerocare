import { AddProductDTO, BulkProductRow } from '../dto/product.dto';
import { AppError } from '../errors/appError';
import { ProductRepository } from '../repositories/productRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { ModelService } from './modelService';
import { WarehouseRepository } from '../repositories/warehouseRepository';
import { Product, ProductStatus } from '../entities/productEntity';
import { logger } from '../config/logger';
import { LotService } from './lotService';
import { LotItemType } from '../entities/lotItemEntity';
import { LotStatus } from '../entities/lotEntity';
import { getCached, setCached, deleteCached, getMultipleCached } from '../utils/cacheUtil';
import { extractR2Key } from '../utils/r2Url';

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
  async bulkCreateProducts(rows: BulkProductRow[], createdBy?: string) {
    const success: string[] = [];
    const failed: { row: number; error: string }[] = [];

    // Batch-fetch every model/warehouse referenced across the whole sheet up
    // front instead of one lookup per row (was 2 queries x N rows).
    const modelIds = [...new Set(rows.map((r) => r.model_no).filter(Boolean))];
    const warehouseIds = [...new Set(rows.map((r) => r.warehouse_id).filter(Boolean))];
    const [modelsById, warehousesById] = await Promise.all([
      this.model.findByIds(modelIds),
      this.warehouse.findByIds(warehouseIds),
    ]);

    const touchedModelIds = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.vendor_id) {
          throw new AppError('vendor_id missing', 400);
        }

        const maxDiscount = row.max_discount_amount ?? 0;
        this.validateDiscount(row.sale_price, maxDiscount);

        const modelDetails = modelsById.get(row.model_no);
        if (!modelDetails) {
          throw new AppError('model not found', 404);
        }
        const warehouseDetails = warehousesById.get(row.warehouse_id);
        if (!warehouseDetails) {
          throw new AppError('warehouse not found ', 404);
        }

        if (row.lot_id) {
          // Guard: inventory cannot be created before lot is received.
          // Sequential per-row (not batched) — validateAndTrackUsage accumulates
          // usage against the lot's remaining quantity, so row N's validity can
          // depend on rows before it consuming from the same lot/model.
          const lot = await this.lotService.getLotById(row.lot_id);
          if (lot.status !== LotStatus.RECEIVED) {
            throw new AppError(
              'Inventory cannot be created until the lot is received. Please confirm the lot reception first.',
              400,
            );
          }
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
          purchase_price: row.purchase_price,
          tax_rate: row.tax_rate,
          model: modelDetails,
          warehouse: warehouseDetails,
          product_status: row.product_status,
          print_colour: row.print_colour,
          machine_type: row.machine_type || modelDetails.machine_type,
          max_discount_amount: maxDiscount,
          wholesale_price: row.wholesale_price,
          lot_id: row.lot_id || undefined,
          description: row.description,
          hs_code: row.hs_code,
          warranty: row.warranty,
          consumables: row.consumables,
          imageUrl: extractR2Key(row.imageUrl),
          features: row.features,
          created_by: createdBy,
        });

        await deleteCached(`product:${product.id}`);
        touchedModelIds.add(modelDetails.id);

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

    // Recompute aggregate quantities once per distinct model touched, instead
    // of once per row (models are commonly repeated across a bulk sheet).
    for (const modelId of touchedModelIds) {
      await this.model.syncModelQuantities(modelId);
      await this.modelService.syncToRedis(modelId);
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
        // Guard: inventory cannot be created before lot is received
        const lot = await this.lotService.getLotById(data.lot_id);
        if (lot.status !== LotStatus.RECEIVED) {
          throw new AppError(
            'Inventory cannot be created until the lot is received. Please confirm the lot reception first.',
            400,
          );
        }
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
        purchase_price: data.purchase_price,
        tax_rate: data.tax_rate,
        model: modelDetails,
        warehouse: warehouseDetails,
        product_status: data.product_status,
        print_colour: data.print_colour,
        machine_type: data.machine_type || modelDetails.machine_type,
        max_discount_amount: maxDiscount,
        wholesale_price: data.wholesale_price,
        imageUrl: data.imageUrl,
        lot_id: data.lot_id,
        description: data.description,
        hs_code: data.hs_code,
        warranty: data.warranty,
        consumables: data.consumables,
        created_by: data.created_by,
      });

      await this.model.syncModelQuantities(modelDetails.id);

      await deleteCached(`product:${product.id}`);

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
   * Retrieves all products, optionally filtered by branch, model, and status.
   * Supports pagination and search.
   */
  async getAllProducts(
    branchId?: string,
    modelId?: string,
    status?: ProductStatus,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    return this.productRepo.getAllProducts(branchId, modelId, status, page, limit, search);
  }

  private static readonly STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
    [ProductStatus.AVAILABLE]: [
      ProductStatus.RENTED,
      ProductStatus.LEASE,
      ProductStatus.SOLD,
      ProductStatus.DAMAGED,
    ],
    [ProductStatus.RENTED]: [
      ProductStatus.AVAILABLE,
      ProductStatus.DAMAGED,
      ProductStatus.RETURNED,
    ],
    [ProductStatus.LEASE]: [ProductStatus.AVAILABLE, ProductStatus.DAMAGED, ProductStatus.RETURNED],
    [ProductStatus.SOLD]: [ProductStatus.RETURNED, ProductStatus.DAMAGED],
    [ProductStatus.DAMAGED]: [ProductStatus.AVAILABLE],
    [ProductStatus.RETURNED]: [ProductStatus.AVAILABLE, ProductStatus.DAMAGED],
  };

  /**
   * Updates a product and clears relevant caches.
   */
  async updateProduct(id: string, data: Partial<Product>) {
    const currentProduct = await this.productRepo.findOne(id);
    if (!currentProduct) {
      throw new AppError('Product not found', 404);
    }

    if (
      data.product_status !== undefined &&
      data.product_status !== currentProduct.product_status
    ) {
      const allowed = ProductService.STATUS_TRANSITIONS[currentProduct.product_status] ?? [];
      if (!allowed.includes(data.product_status)) {
        throw new AppError(
          `Invalid status transition: ${currentProduct.product_status} → ${data.product_status}`,
          400,
        );
      }
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
