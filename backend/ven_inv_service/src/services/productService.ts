import { AddProductDTO, BulkProductRow } from '../dto/product.dto';
import { AppError } from '../errors/appError';
import { ProductRepository } from '../repositories/productRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { WarehouseRepository } from '../repositories/warehouseRepository';
import { Product } from '../entities/productEntity';
import { logger } from '../config/logger';

export class ProductService {
  private productRepo = new ProductRepository();
  private model = new ModelRepository();
  private warehouse = new WarehouseRepository();

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
        await this.model.updateModel(modelDetails.id, { quantity: modelDetails.quantity + 1 });
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
          print_colour: row.print_colour,
          max_discount_amount: maxDiscount,
        });
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
      const warehouseDetails = await this.warehouse.findById(data.warehouse_id);
      if (!warehouseDetails) {
        throw new AppError('warehouse not found ', 404);
      }
      await this.model.updateModel(modelDetails.id, { quantity: modelDetails.quantity + 1 });
      return await this.productRepo.addProduct({
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
      });
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

    return this.productRepo.updateProduct(id, data);
  }

  async findOne(id: string) {
    return this.productRepo.findOne(id);
  }
}
