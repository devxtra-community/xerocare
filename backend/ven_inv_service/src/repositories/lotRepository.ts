import { EntityManager, FindOptionsWhere } from 'typeorm';
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
      lot.branch_id = data.branchId;
      lot.warehouse_id = data.warehouseId;
      lot.createdBy = data.createdBy;

      lot.transportationCost = data.transportationCost || 0;
      lot.documentationCost = data.documentationCost || 0;
      lot.shippingCost = data.shippingCost || 0;
      lot.groundFieldCost = data.groundFieldCost || 0;
      lot.certificationCost = data.certificationCost || 0;
      lot.labourCost = data.labourCost || 0;

      const savedLot = await manager.save(Lot, lot);

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

            // Determine model ID for spare part (null/undefined/'universal' means Universal)
            const spModelId =
              itemData.modelId && itemData.modelId !== 'universal' ? itemData.modelId : null;

            const partName = itemData.partName?.trim();
            const brand = itemData.brand?.trim();

            if (!partName || !brand) {
              throw new AppError('Part Name and Brand are required', 400);
            }

            // Check if spare part already exists to prevent duplicates
            // We must now also check model_id match to avoid mixing compatible models
            const query = manager
              .getRepository(SparePart)
              .createQueryBuilder('sparePart')
              .where('LOWER(sparePart.part_name) = LOWER(:partName)', {
                partName,
              })
              .andWhere('LOWER(sparePart.brand) = LOWER(:brand)', { brand })
              .andWhere('sparePart.branch_id = :branchId', { branchId: data.branchId });

            if (spModelId) {
              query.andWhere('sparePart.model_id = :modelId', { modelId: spModelId });
            } else {
              query.andWhere('sparePart.model_id IS NULL');
            }

            let sparePart = await query.getOne();

            // Smart Name Cleaning: If not found, check if user typed "Brand + Name" (e.g., "Dell Beam")
            if (!sparePart) {
              const lowerName = partName.toLowerCase();
              const lowerBrand = brand.toLowerCase();

              if (lowerName.startsWith(lowerBrand)) {
                const cleanedName = partName.substring(brand.length).trim();
                if (cleanedName) {
                  const retryQuery = manager
                    .getRepository(SparePart)
                    .createQueryBuilder('sparePart')
                    .where('LOWER(sparePart.part_name) = LOWER(:partName)', {
                      partName: cleanedName,
                    })
                    .andWhere('LOWER(sparePart.brand) = LOWER(:brand)', { brand })
                    .andWhere('sparePart.branch_id = :branchId', { branchId: data.branchId });

                  if (spModelId) {
                    retryQuery.andWhere('sparePart.model_id = :modelId', { modelId: spModelId });
                  } else {
                    retryQuery.andWhere('sparePart.model_id IS NULL');
                  }

                  sparePart = await retryQuery.getOne();
                }
              }
            }

            // Fallback: If not found with specific model, try looking for Universal (NULL model)
            if (!sparePart && spModelId) {
              const universalQuery = manager
                .getRepository(SparePart)
                .createQueryBuilder('sparePart')
                .where('LOWER(sparePart.part_name) = LOWER(:partName)', { partName })
                .andWhere('LOWER(sparePart.brand) = LOWER(:brand)', { brand })
                .andWhere('sparePart.branch_id = :branchId', { branchId: data.branchId })
                .andWhere('sparePart.model_id IS NULL');

              sparePart = await universalQuery.getOne();
            }

            if (!sparePart) {
              // AUTOMATICALLY CREATE NEW SPARE PART
              // User requested seamless addition. If not found, create it.
              sparePart = new SparePart();
              sparePart.part_name = itemData.partName; // Use original input
              sparePart.brand = brand;
              sparePart.branch_id = data.branchId;
              sparePart.base_price = itemData.unitPrice || 0;

              // Generate Item Code (Required Field)
              // Format: SP-{TIMESTAMP}-{RANDOM}
              const timestamp = Date.now().toString(36).toUpperCase();
              const random = Math.random().toString(36).substring(2, 6).toUpperCase();
              sparePart.item_code = `SP-${timestamp}-${random}`;

              if (spModelId) {
                sparePart.model_id = spModelId;
              }

              sparePart.lot_id = savedLot.id;

              sparePart = await manager.save(SparePart, sparePart);
            }

            lotItem.sparePartId = sparePart.id;
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
        Number(savedLot.transportationCost) +
        Number(savedLot.documentationCost) +
        Number(savedLot.shippingCost) +
        Number(savedLot.groundFieldCost) +
        Number(savedLot.certificationCost) +
        Number(savedLot.labourCost);

      savedLot.totalAmount = itemsTotal + costsTotal;
      savedLot.items = lotItems;

      return await manager.save(Lot, savedLot);
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
      let lotItem: LotItem | null;

      if (itemType === LotItemType.MODEL) {
        // For MODEL type: no join needed, just filter by modelId directly
        lotItem = await manager
          .createQueryBuilder(LotItem, 'lotItem')
          .where('lotItem.lotId = :lotId', { lotId })
          .andWhere('lotItem.itemType = :itemType', { itemType })
          .andWhere('lotItem.modelId = :identifier', { identifier })
          .setLock('pessimistic_write')
          .getOne();
      } else {
        // For SPARE_PART type: use INNER JOIN so FOR UPDATE is valid (no nullable side)
        lotItem = await manager
          .createQueryBuilder(LotItem, 'lotItem')
          .innerJoinAndSelect('lotItem.sparePart', 'sparePart')
          .where('lotItem.lotId = :lotId', { lotId })
          .andWhere('lotItem.itemType = :itemType', { itemType })
          .andWhere('sparePart.item_code = :identifier', { identifier })
          .setLock('pessimistic_write')
          .getOne();
      }

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
   * Retrieves all lots with relations, optionally filtered by branch.
   */
  async getAllLots(branchId?: string) {
    console.log('LotRepository: getAllLots called, branchId:', branchId);
    try {
      const where: FindOptionsWhere<Lot> = {};
      if (branchId && branchId !== 'All') {
        where.branch_id = branchId;
      }

      const result = await this.repo.find({
        where,
        relations: {
          vendor: true,
          warehouse: true, // I should add this!
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
      console.log('LotRepository: getAllLots success, count:', result.length);
      return result;
    } catch (err) {
      console.error('LotRepository: getAllLots FAILED', err);
      throw err;
    }
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
          sparePart: {
            model: {
              brandRelation: true,
            },
          },
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

  /**
   * Calculates total spending on lots for a branch and year.
   */
  async getLotTotals(branchId?: string, year?: number): Promise<number> {
    const qb = this.repo.createQueryBuilder('lot').select('SUM(lot.totalAmount)', 'total');

    if (branchId && branchId !== 'All') {
      qb.where('lot.branch_id = :branchId', { branchId });
    }

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM lot.purchaseDate) = :year', { year });
    }

    const res = await qb.getRawOne();
    return parseFloat(res?.total) || 0;
  }

  /**
   * Returns monthly lot expenses for a branch and year.
   */
  async getMonthlyLotTotals(
    branchId?: string,
    year?: number,
  ): Promise<{ month: string; total: number }[]> {
    const qb = this.repo
      .createQueryBuilder('lot')
      .select("TO_CHAR(lot.purchaseDate, 'YYYY-MM')", 'month')
      .addSelect('SUM(lot.totalAmount)', 'total');

    if (branchId && branchId !== 'All') {
      qb.where('lot.branch_id = :branchId', { branchId });
    }

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM lot.purchaseDate) = :year', { year });
    }

    const res = await qb
      .groupBy("TO_CHAR(lot.purchaseDate, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    return res.map((r) => ({
      month: r.month,
      total: parseFloat(r.total) || 0,
    }));
  }
}
