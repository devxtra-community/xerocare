import { EntityManager } from 'typeorm';
import { Source } from '../config/db';
import { Lot, LotStatus } from '../entities/lotEntity';
import { LotItem, LotItemType } from '../entities/lotItemEntity';
import { SparePart } from '../entities/sparePartEntity';
import { AppError } from '../errors/appError';
import { CreateLotDto } from '../types/lotTypes';

export class LotRepository {
  private get repo() {
    return Source.getRepository(Lot);
  }

  /**
   * Creates a new lot with items in a transaction.
   */
  async createLot(data: CreateLotDto): Promise<Lot> {
    return await Source.transaction(async (manager: EntityManager) => {
      const existingLot = await manager.findOne(Lot, {
        where: { lotNumber: data.lotNumber },
      });
      if (existingLot) {
        throw new AppError('Lot number already exists', 400);
      }

      const lot = new Lot();
      lot.vendorId = data.vendorId;
      lot.lotNumber = data.lotNumber;
      lot.purchaseDate = new Date(data.purchaseDate);
      lot.notes = data.notes;
      lot.status = LotStatus.COMPLETED;
      lot.branchId = data.branchId;
      lot.createdBy = data.createdBy;

      lot.transportationCost = data.transportationCost || 0;
      lot.documentationCost = data.documentationCost || 0;
      lot.shippingCost = data.shippingCost || 0;
      lot.groundFieldCost = data.groundFieldCost || 0;
      lot.certificationCost = data.certificationCost || 0;
      lot.labourCost = data.labourCost || 0;

      let itemsTotal = 0;
      const lotItems: LotItem[] = [];

      for (const itemData of data.items) {
        const lotItem = new LotItem();
        lotItem.itemType = itemData.itemType;
        lotItem.quantity = itemData.quantity;
        lotItem.usedQuantity = 0;
        lotItem.unitPrice = itemData.unitPrice;
        lotItem.totalPrice = itemData.quantity * itemData.unitPrice;

        if (itemData.itemType === LotItemType.MODEL) {
          if (!itemData.modelId) throw new AppError('Model ID required for Model item', 400);
          lotItem.modelId = itemData.modelId;
        } else if (itemData.itemType === LotItemType.SPARE_PART) {
          if (itemData.sparePartId) {
            lotItem.sparePartId = itemData.sparePartId;
          } else if (itemData.brand && itemData.partName) {
            if (!data.branchId) {
              throw new AppError('Branch ID is required to create new spare parts', 400);
            }

            const sparePart = new SparePart();
            sparePart.part_name = itemData.partName;
            sparePart.brand = itemData.brand;
            sparePart.base_price = itemData.unitPrice;
            sparePart.quantity = 0;
            sparePart.branch_id = data.branchId;

            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
            sparePart.item_code = `SP-${timestamp}-${randomStr}`;

            const savedSparePart = await manager.save(SparePart, sparePart);
            lotItem.sparePartId = savedSparePart.id;
          } else {
            throw new AppError(
              'Spare Part requires either sparePartId or both brand and partName',
              400,
            );
          }
        }

        itemsTotal += lotItem.totalPrice;
        lotItems.push(lotItem);
      }

      const costsTotal =
        Number(lot.transportationCost) +
        Number(lot.documentationCost) +
        Number(lot.shippingCost) +
        Number(lot.groundFieldCost) +
        Number(lot.certificationCost) +
        Number(lot.labourCost);

      lot.totalAmount = itemsTotal + costsTotal;
      lot.items = lotItems;

      return await manager.save(Lot, lot);
    });
  }

  /**
   * Tracks usage of lot items, ensuring quantity limits.
   */
  async validateAndTrackUsage(
    lotId: string,
    itemType: LotItemType,
    identifier: string,
    quantity: number,
    transactionManager?: EntityManager,
  ): Promise<void> {
    const runInTransaction = async (manager: EntityManager) => {
      const query = manager
        .createQueryBuilder(LotItem, 'lotItem')
        .leftJoinAndSelect('lotItem.sparePart', 'sparePart')
        .where('lotItem.lotId = :lotId', { lotId })
        .andWhere('lotItem.itemType = :itemType', { itemType });

      if (itemType === LotItemType.MODEL) {
        query.andWhere('lotItem.modelId = :identifier', { identifier });
      } else {
        query.andWhere('sparePart.item_code = :identifier', { identifier });
      }

      query.setLock('pessimistic_write');

      const lotItem = await query.getOne();

      if (!lotItem) {
        throw new AppError(
          `This lot does not contain this ${itemType === LotItemType.MODEL ? 'Product Model' : 'Spare Part'}`,
          400,
        );
      }

      const remainingManager = lotItem.quantity - lotItem.usedQuantity;
      if (quantity > remainingManager) {
        throw new AppError(
          `Lot quantity exceeded. Remaining: ${remainingManager}, Requested: ${quantity}`,
          400,
        );
      }

      lotItem.usedQuantity += quantity;
      await manager.save(LotItem, lotItem);
    };

    if (transactionManager) {
      await runInTransaction(transactionManager);
    } else {
      await Source.transaction(async (manager) => {
        await runInTransaction(manager);
      });
    }
  }

  /**
   * Retrieves all lots with relations.
   */
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

  /**
   * Retrieves a lot by ID.
   */
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

  /**
   * Retrieves a lot by lot number.
   */
  async getLotByNumber(lotNumber: string) {
    return this.repo.findOne({
      where: { lotNumber },
      relations: {
        vendor: true,
      },
    });
  }
}
