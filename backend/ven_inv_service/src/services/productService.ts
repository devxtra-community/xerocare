import { Product } from "../entities/productEntity";
import { AppError } from "../errors/appError";
import { ProductRepository } from "../repositories/productRepository";


export class ProductService {
    private productRepo = new ProductRepository();

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
            throw new AppError("Product not found",404);
        }
        return this.productRepo.deleteProduct(id);
    }   
}