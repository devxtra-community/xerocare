import { Source } from "../config/db";
import { Product } from "../entities/productEntity";

export class ProductRepository {
    private repo = Source.getRepository(Product);

    async addProduct(data: any) {
        const product = this.repo.create(data);
        return this.repo.save(product);
    }

    async getAllProducts() {
        return this.repo.find({
            relations: {
                model_id: true
            }
        });
    }

    async updateProduct(id: string, data: any) {
        await this.repo.update(id, data);
        return this.repo.findOne({
            where: { id },
            relations: {
                model_id: true
            }
        });
    }

    async deleteProduct(id: string) {
        return this.repo.delete(id);
    }

    async findOne(id: string) {
        return this.repo.findOne({
            where: { id },
            relations: {
                model_id: true
            }
        });
    }
}