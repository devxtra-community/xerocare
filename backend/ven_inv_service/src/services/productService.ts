import { Source } from '../config/db';
import { AddProductDTO, BulkProductRow } from '../dto/product.dto';
import { AppError } from '../errors/appError';
import { ProductRepository } from '../repositories/productRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { WarehouseRepository } from '../repositories/warehouseRepository';
import { Product } from '../entities/productEntity';

export class ProductService {
  private productRepo = new ProductRepository();
  private source = Source;
  private model = new ModelRepository();
  private warehouse = new WarehouseRepository();

  async bulkCreateProducts(rows: BulkProductRow[]) {
    const success: string[] = [];
    const failed: { row: number; error: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const modelDetails = await this.model.findbyid(row.model_no);
        if (!modelDetails) {
          throw new AppError('model not found', 404);
        }
        const warehouseDetails = await this.warehouse.findById(row.warehouse_id);
        if (!warehouseDetails) {
          throw new AppError('warehouse not found ', 404);
        }
        await this.productRepo.addProduct({
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
        });
        success.push(row.serial_no);
      } catch (error: unknown) {
        failed.push({ row: i + 1, error: (error as Error).message || 'Unknown error' });
      }
    }
    return { success, failed };
  }

  async addProduct(data: AddProductDTO) {
    try {
      const modelDetails = await this.model.findbyid(data.model_id);
      if (!modelDetails) {
        throw new AppError('model not found', 404);
      }
      const warehouseDetails = await this.warehouse.findById(data.warehouse_id);
      if (!warehouseDetails) {
        throw new AppError('warehouse not found ', 404);
      }
      return await this.productRepo.addProduct({
        vendor_id: String(data.vendor_id),
        serial_no: data.serial_no,
        name: data.name,
        brand: data.brand,
        MFD: new Date(data.MFD),
        sale_price: data.sale_price,
        tax_rate: data.tax_rate,
        model: modelDetails,
        warehouse: warehouseDetails,
        product_status: data.product_status,
      });
    } catch (err: unknown) {
      console.log(err);
      throw new AppError('Failed to add product', 500);
    }
  }
  async deleteProduct(id: string) {
    const product = await this.productRepo.findOne(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return this.productRepo.deleteProduct(id);
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
