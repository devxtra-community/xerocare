import { Source } from "../config/db";
import { Product } from "../entities/productEntity";

export class ProductRepository {
    private repo = Source.getRepository(Product);

    async addProduct(data: Partial<Product>) {
        const product = this.repo.create(data);
        return this.repo.save(product);
    }

    async getAllProducts() {
        return this.repo.find();
    }

    async updateProduct(id: number, data: Partial<Product>) {
        await this.repo.update(id, data);
        return this.repo.findOne({ where: { id } });
    }

    async deleteProduct(id: number) {
        return this.repo.delete(id);
    }   
}