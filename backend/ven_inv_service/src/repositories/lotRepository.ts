import { Source } from '../config/db';
import { Lot } from '../entities/lotEntity';

export class LotRepository {
    private get repo() {
        return Source.getRepository(Lot);
    }

    async createLot(data: Partial<Lot>) {
        const lot = this.repo.create(data);
        return this.repo.save(lot);
    }

    async getAllLots() {
        return this.repo.find({
            relations: {
                vendor: true,
                items: {
                    model: {
                        brandRelation: true,
                    },
                    sparePart: true,
                },
            },
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async getLotById(id: string) {
        return this.repo.findOne({
            where: { id },
            relations: {
                vendor: true,
                items: {
                    model: {
                        brandRelation: true,
                    },
                    sparePart: true,
                },
            },
        });
    }
}
