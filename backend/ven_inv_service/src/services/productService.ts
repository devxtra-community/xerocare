import { Product } from "../entities/productEntity";
import { ProductRepository } from "../repositories/productRepository";


export class ProductService {
    private productRepo = new ProductRepository();

    async addProduct(data: Partial<Product>) {
        return this.productRepo.addProduct(data);
    }

    async getAllProducts() {
        return this.productRepo.getAllProducts();
    }

    async updateProduct(id: number, data: Partial<Product>) {
        return this.productRepo.updateProduct(id, data);
    }

    async deleteProduct(id: number) {
        return this.productRepo.deleteProduct(id);
    }   
}