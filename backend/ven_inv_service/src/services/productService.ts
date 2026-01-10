import { Inventory } from '../entities/inventoryEntity';
import { Model } from '../entities/modelEntity';
import { Product } from '../entities/productEntity';
import { Warehouse } from '../entities/warehouseEntity';
import { AppError } from '../errors/appError';
import { ProductRepository } from '../repositories/productRepository';
import { Source } from '../config/db';

interface BulkProductRow {
  vendor_id: number | string;
  serial_no: string;
  name: string;
  brand: string;
  MFD: string | Date;
  rent_price_monthly: number;
  rent_price_yearly: number;
  lease_price_monthly: number;
  lease_price_yearly: number;
  sale_price: number;
  tax_rate: number;
  model_no: string | number;
}

export class ProductService {
  private source = Source;
  private productRepo = new ProductRepository();

  async bulkCreateProducts(rows: BulkProductRow[]) {
    const success: string[] = [];
    const failed: { row: number; error: string }[] = [];

    await this.source.transaction(async (manager) => {
      const warehouses = await manager.find(Warehouse);

      const models = await manager.find(Model);
      const modelMap = new Map(models.map((m) => [m.model_no, m]));

      for (let i = 0; i < rows.length; i++) {
        try {
          const r = rows[i];

          if (!r.serial_no || !r.model_no || !r.name) throw new Error('Missing required fields');

          const model = modelMap.get(String(r.model_no));
          if (!model) throw new Error('Invalid model_no');

          const product = manager.create(Product, {
            model,
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
          });

          const saved = await manager.save(product);

          for (const w of warehouses) {
            await manager.save(
              manager.create(Inventory, {
                product: saved,
                warehouse: w,
                total_qty: 0,
                available_qty: 0,
                damaged_qty: 0,
              }),
            );
          }

          success.push(saved.id);
        } catch (err: unknown) {
          failed.push({
            row: i + 1,
            error: (err as Error).message || 'Invalid row',
          });
        }
      }
    });

    return {
      successCount: success.length,
      failedRows: failed,
    };
  }

  async addProduct(data: Partial<Product>) {
    return this.productRepo.addProduct(data);
  }

  async getAllProducts() {
    return this.productRepo.getAllProducts();
  }

  async updateProduct(id: string, data: Partial<Product>) {
    return this.productRepo.updateProduct(id, data);
  }

  async deleteProduct(id: string) {
    const product = this.productRepo.findOne(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return this.productRepo.deleteProduct(id);
  }
}
