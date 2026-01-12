import { Source } from '../config/db';
import { AddProductDTO, BulkProductRow } from '../dto/product.dto';
import { Inventory } from '../entities/inventoryEntity';
import { Model } from '../entities/modelEntity';
import { Product, ProductStatus } from '../entities/productEntity';
import { Warehouse } from '../entities/warehouseEntity';
import { AppError } from '../errors/appError';
import { ProductRepository } from '../repositories/productRepository';

export class ProductService {
  private productRepo = new ProductRepository();
  private source = Source;

  //adding bulk products as per the data provided by the frontend
  async bulkCreateProducts(rows: BulkProductRow[]) {
    const success: string[] = [];
    const failed: { row: number; error: string }[] = [];

    await this.source.transaction(async (manager) => {
      const models = await manager.find(Model);
      const warehouses = await manager.find(Warehouse);

      const modelMap = new Map(models.map((m) => [String(m.model_no), m]));
      const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

      for (let i = 0; i < rows.length; i++) {
        try {
          const r = rows[i];

          if (!r.model_no || !r.warehouse_id || !r.serial_no)
            throw new AppError('Missing required fields', 400);

          const model = modelMap.get(String(r.model_no));
          if (!model) throw new AppError('Invalid model', 400);

          const warehouse = warehouseMap.get(r.warehouse_id);
          if (!warehouse) throw new AppError('Invalid warehouse', 400);

          const product = manager.create(Product, {
            model,
            warehouse,
            vendor_id: Number(r.vendor_id),
            serial_no: String(r.serial_no),
            name: r.name,
            brand: r.brand,
            MFD: new Date(r.MFD),
            rent_price_monthly: r.rent_price_monthly,
            rent_price_yearly: r.rent_price_yearly,
            lease_price_monthly: r.lease_price_monthly,
            lease_price_yearly: r.lease_price_yearly,
            sale_price: r.sale_price,
            tax_rate: r.tax_rate,
            product_status: ProductStatus.AVAILABLE,
          });

          await manager.save(product);

          let inventory = await manager.findOne(Inventory, {
            where: { model: { id: model.id }, warehouse: { id: warehouse.id } },
            lock: { mode: 'pessimistic_write' },
          });

          if (!inventory) {
            inventory = manager.create(Inventory, {
              model,
              warehouse,
              total_qty: 1,
              available_qty: 1,
              damaged_qty: 0,
            });
          } else {
            inventory.total_qty += 1;
            inventory.available_qty += 1;
          }

          await manager.save(inventory);

          success.push(product.serial_no);
        } catch (err) {
          failed.push({
            row: i + 1,
            error: err instanceof Error ? err.message : 'Invalid row',
          });
        }
      }
    });

    return { successCount: success.length, failedRows: failed };
  }

  // async markDamaged(productId: string) {
  //   return this.source.transaction(async (manager) => {
  //     const product = await manager.findOne(Product, {
  //       where: { id: productId },
  //       relations: { model: true, warehouse: true },
  //     });
  //     if (!product) throw new AppError('Product not found', 404);

  //     if (product.product_status === ProductStatus.DAMAGED)
  //       throw new AppError('Product already damaged', 400);

  //     const inventory = await manager.findOne(Inventory, {
  //       where: { model: { id: product.model.id }, warehouse: { id: product.warehouse.id } },
  //       lock: { mode: 'pessimistic_write' },
  //     });
  //     if (!inventory) throw new AppError('Inventory missing', 500);

  //     if (inventory.available_qty <= 0) throw new AppError('No available stock', 400);

  //     product.product_status = ProductStatus.DAMAGED;

  //     inventory.available_qty -= 1;
  //     inventory.damaged_qty += 1;

  //     await manager.save(product);
  //     await manager.save(inventory);

  //     return product;
  //   });
  // }

  // async markSold(productId: string) {
  //   return this.source.transaction(async (manager) => {
  //     const product = await manager.findOne(Product, {
  //       where: { id: productId },
  //       relations: { model: true, warehouse: true },
  //     });
  //     if (!product) throw new AppError('Product not found', 404);

  //     if (product.product_status !== ProductStatus.AVAILABLE)
  //       throw new AppError('Product not available for sale', 400);

  //     const inventory = await manager.findOne(Inventory, {
  //       where: { model: { id: product.model.id }, warehouse: { id: product.warehouse.id } },
  //       lock: { mode: 'pessimistic_write' },
  //     });
  //     if (!inventory) throw new AppError('Inventory missing', 500);

  //     if (inventory.available_qty <= 0) throw new AppError('No available stock', 400);

  //     product.product_status = ProductStatus.SOLD;

  //     inventory.available_qty -= 1;
  //     inventory.total_qty -= 1;

  //     await manager.save(product);
  //     await manager.save(inventory);

  //     return product;
  //   });
  // }
  async deleteProduct(id: string) {
    return this.source.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id },
        relations: { model: true, warehouse: true },
      });
      if (!product) throw new AppError('Product not found', 404);

      const inventory = await manager.findOne(Inventory, {
        where: { model: { id: product.model.id }, warehouse: { id: product.warehouse.id } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventory) throw new AppError('Inventory missing', 500);

      if (product.product_status === ProductStatus.AVAILABLE) {
        inventory.available_qty -= 1;
        inventory.total_qty -= 1;
      } else if (product.product_status === ProductStatus.DAMAGED) {
        inventory.damaged_qty -= 1;
        inventory.total_qty -= 1;
      }

      await manager.remove(product);
      await manager.save(inventory);

      return true;
    });
  }
  async addProduct(data: AddProductDTO) {
    return this.source.transaction(async (manager) => {
      const model = await manager.findOne(Model, { where: { id: data.model_id } });
      if (!model) throw new AppError('Invalid model', 400);

      const warehouse = await manager.findOne(Warehouse, { where: { id: data.warehouse_id } });
      if (!warehouse) throw new AppError('Invalid warehouse', 400);

      const product = manager.create(Product, {
        ...data,
        model,
        warehouse,
        product_status: ProductStatus.AVAILABLE,
      });

      const saved = await manager.save(product);

      let inventory = await manager.findOne(Inventory, {
        where: { model: { id: model.id }, warehouse: { id: warehouse.id } },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        inventory = manager.create(Inventory, {
          model,
          warehouse,
          total_qty: 1,
          available_qty: 1,
          damaged_qty: 0,
        });
      } else {
        inventory.total_qty += 1;
        inventory.available_qty += 1;
      }

      await manager.save(inventory);

      return saved;
    });
  }

  async getAllProducts() {
    return this.productRepo.getAllProducts();
  }

  async updateProduct(id: string, data: Partial<Product>) {
    return this.productRepo.updateProduct(id, data);
  }

  async findOne(id: string) {
    return this.productRepo.findOne(id);
  }
}
