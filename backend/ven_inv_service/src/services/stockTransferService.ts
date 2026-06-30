import { Source } from '../config/db';
import { StockTransfer, TransferStatus, TransferType } from '../entities/stockTransferEntity';
import { StockTransferItem, TransferItemType } from '../entities/stockTransferItemEntity';
import { SparePartInventory } from '../entities/sparePartInventoryEntity';
import { Product } from '../entities/productEntity';

function generateTransferNumber(): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `STR-${yyyymm}-${rand}`;
}

interface ItemInput {
  item_type: TransferItemType;
  spare_part_id?: string;
  product_id?: string;
  requested_qty: number;
  item_name?: string;
}

interface RespondItemInput {
  itemId: string;
  fulfilled_qty: number;
  source_warehouse_id?: string;
}

interface ReceiveItemInput {
  itemId: string;
  received_qty: number;
}

export class StockTransferService {
  private transferRepo = Source.getRepository(StockTransfer);
  private itemRepo = Source.getRepository(StockTransferItem);
  private spInventoryRepo = Source.getRepository(SparePartInventory);
  private productRepo = Source.getRepository(Product);

  async createDraft(
    payload: {
      transfer_type: TransferType;
      source_branch_id: string;
      source_warehouse_id?: string;
      requesting_warehouse_id?: string;
      notes?: string;
      items: ItemInput[];
    },
    userId: string,
    branchId: string,
  ): Promise<StockTransfer> {
    const transfer = this.transferRepo.create({
      transfer_number: generateTransferNumber(),
      transfer_type: payload.transfer_type,
      status: TransferStatus.DRAFT,
      requesting_branch_id: branchId,
      source_branch_id: payload.source_branch_id,
      source_warehouse_id: payload.source_warehouse_id || undefined,
      requesting_warehouse_id: payload.requesting_warehouse_id || undefined,
      requested_by_id: userId,
      notes: payload.notes || undefined,
    });

    const saved = await this.transferRepo.save(transfer);

    const items = payload.items.map((i) =>
      this.itemRepo.create({
        transfer_id: saved.id,
        item_type: i.item_type,
        spare_part_id: i.spare_part_id || undefined,
        product_id: i.product_id || undefined,
        requested_qty: i.requested_qty,
        item_name: i.item_name || undefined,
      }),
    );

    await this.itemRepo.save(items);
    return this.getById(saved.id);
  }

  async submit(id: string, userId: string, branchId: string, role: string): Promise<StockTransfer> {
    const transfer = await this.getById(id);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== TransferStatus.DRAFT)
      throw new Error('Only DRAFT transfers can be submitted');

    const isAdmin = role === 'ADMIN';
    if (!isAdmin && transfer.requesting_branch_id !== branchId) {
      throw new Error('Access denied');
    }
    if (!isAdmin && transfer.requested_by_id !== userId) {
      throw new Error('Only the creator can submit this transfer');
    }

    if (transfer.items.length === 0) {
      throw new Error('Add at least one item before submitting');
    }

    // Intra-branch: requesting manager handles both sides → skip to ACCEPTED
    const newStatus =
      transfer.transfer_type === TransferType.INTRA_BRANCH
        ? TransferStatus.ACCEPTED
        : TransferStatus.PENDING;

    await this.transferRepo.update(id, { status: newStatus });
    return this.getById(id);
  }

  // Source branch manager reviews and responds to PENDING request
  async respond(
    id: string,
    userId: string,
    branchId: string,
    role: string,
    payload: {
      items: RespondItemInput[];
      rejection_reason?: string;
    },
  ): Promise<StockTransfer> {
    const transfer = await this.getById(id);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new Error('Only PENDING transfers can be responded to');
    }

    const isAdmin = role === 'ADMIN';
    if (!isAdmin && transfer.source_branch_id !== branchId) {
      throw new Error('Access denied: You are not the source branch manager');
    }

    // Full rejection
    if (payload.rejection_reason) {
      await this.transferRepo.update(id, {
        status: TransferStatus.REJECTED,
        rejection_reason: payload.rejection_reason,
        responded_by_id: userId,
        responded_at: new Date(),
      });
      return this.getById(id);
    }

    // Update fulfilled_qty and source_warehouse_id per item
    for (const ri of payload.items) {
      await this.itemRepo.update(ri.itemId, {
        fulfilled_qty: ri.fulfilled_qty,
        source_warehouse_id: ri.source_warehouse_id || undefined,
      });
    }

    // Determine status: all fulfilled = ACCEPTED, some = PARTIALLY_ACCEPTED
    const allFulfilled = payload.items.every((ri) => {
      const item = transfer.items.find((i) => i.id === ri.itemId);
      return item && ri.fulfilled_qty >= item.requested_qty;
    });
    const anyFulfilled = payload.items.some((ri) => ri.fulfilled_qty > 0);

    let newStatus: TransferStatus;
    if (!anyFulfilled) {
      newStatus = TransferStatus.REJECTED;
    } else if (allFulfilled) {
      newStatus = TransferStatus.ACCEPTED;
    } else {
      newStatus = TransferStatus.PARTIALLY_ACCEPTED;
    }

    await this.transferRepo.update(id, {
      status: newStatus,
      responded_by_id: userId,
      responded_at: new Date(),
    });

    return this.getById(id);
  }

  // Source branch manager dispatches the stock
  async dispatch(
    id: string,
    userId: string,
    branchId: string,
    role: string,
  ): Promise<StockTransfer> {
    const transfer = await this.getById(id);
    if (!transfer) throw new Error('Transfer not found');

    const acceptableStatuses = [TransferStatus.ACCEPTED, TransferStatus.PARTIALLY_ACCEPTED];
    if (!acceptableStatuses.includes(transfer.status)) {
      throw new Error('Only ACCEPTED or PARTIALLY_ACCEPTED transfers can be dispatched');
    }

    const isAdmin = role === 'ADMIN';
    // For intra-branch, the requesting manager IS the source manager (same branch)
    const isSourceBranch = transfer.source_branch_id === branchId;
    const isRequestingBranch = transfer.requesting_branch_id === branchId;
    const canDispatch =
      isAdmin ||
      isSourceBranch ||
      (transfer.transfer_type === TransferType.INTRA_BRANCH && isRequestingBranch);

    if (!canDispatch) throw new Error('Access denied: Not the source branch');

    // Deduct from source inventory
    const itemsToSend = transfer.items.filter((i) => (i.fulfilled_qty ?? i.requested_qty) > 0);

    for (const item of itemsToSend) {
      const qty = item.fulfilled_qty ?? item.requested_qty;

      if (item.item_type === TransferItemType.SPARE_PART && item.spare_part_id) {
        const warehouseId = item.source_warehouse_id || transfer.source_warehouse_id;
        if (!warehouseId) continue;

        const inv = await this.spInventoryRepo.findOne({
          where: { spare_part_id: item.spare_part_id, warehouse_id: warehouseId },
        });
        if (!inv) throw new Error(`No inventory found for spare part in selected warehouse`);
        if (inv.quantity < qty) throw new Error(`Insufficient stock for spare part in warehouse`);
        await this.spInventoryRepo.update(inv.id, { quantity: inv.quantity - qty });
      }

      if (item.item_type === TransferItemType.PRODUCT && item.product_id) {
        // Mark product as in transit — clear warehouse_id temporarily
        await this.productRepo.update(item.product_id, {
          warehouse_id: null,
          transfer_status: 'IN_TRANSIT',
        } as never);
      }
    }

    await this.transferRepo.update(id, {
      status: TransferStatus.IN_TRANSIT,
      dispatched_at: new Date(),
    });
    return this.getById(id);
  }

  // Requesting branch manager receives the stock
  async receive(
    id: string,
    userId: string,
    branchId: string,
    role: string,
    payload: {
      destination_warehouse_id: string;
      items: ReceiveItemInput[];
    },
  ): Promise<StockTransfer> {
    const transfer = await this.getById(id);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new Error('Only IN_TRANSIT transfers can be received');
    }

    const isAdmin = role === 'ADMIN';
    if (!isAdmin && transfer.requesting_branch_id !== branchId) {
      throw new Error('Access denied: Not the requesting branch');
    }

    const destWarehouseId = payload.destination_warehouse_id;

    for (const ri of payload.items) {
      await this.itemRepo.update(ri.itemId, {
        received_qty: ri.received_qty,
        destination_warehouse_id: destWarehouseId,
      });

      const item = transfer.items.find((i) => i.id === ri.itemId);
      if (!item || ri.received_qty === 0) continue;

      if (item.item_type === TransferItemType.SPARE_PART && item.spare_part_id) {
        // Upsert spare part inventory at destination warehouse
        const existing = await this.spInventoryRepo.findOne({
          where: { spare_part_id: item.spare_part_id, warehouse_id: destWarehouseId },
        });
        if (existing) {
          await this.spInventoryRepo.update(existing.id, {
            quantity: existing.quantity + ri.received_qty,
          });
        } else {
          await this.spInventoryRepo.save(
            this.spInventoryRepo.create({
              spare_part_id: item.spare_part_id,
              warehouse_id: destWarehouseId,
              quantity: ri.received_qty,
            }),
          );
        }
      }

      if (item.item_type === TransferItemType.PRODUCT && item.product_id) {
        // Move product to destination warehouse + mark available
        await this.productRepo.update(item.product_id, {
          warehouse_id: destWarehouseId,
          transfer_status: 'NONE',
        } as never);
      }
    }

    // Update transfer with destination warehouse
    await this.transferRepo.update(id, {
      status: TransferStatus.RECEIVED,
      requesting_warehouse_id: destWarehouseId,
      received_at: new Date(),
    });

    return this.getById(id);
  }

  async cancel(id: string, userId: string, branchId: string, role: string): Promise<StockTransfer> {
    const transfer = await this.getById(id);
    if (!transfer) throw new Error('Transfer not found');

    const cancellable = [TransferStatus.DRAFT, TransferStatus.PENDING];
    if (!cancellable.includes(transfer.status)) {
      throw new Error('Only DRAFT or PENDING transfers can be cancelled');
    }

    const isAdmin = role === 'ADMIN';
    if (
      !isAdmin &&
      transfer.requesting_branch_id !== branchId &&
      transfer.source_branch_id !== branchId
    ) {
      throw new Error('Access denied');
    }

    await this.transferRepo.update(id, { status: TransferStatus.CANCELLED });
    return this.getById(id);
  }

  async list(
    userId: string,
    branchId: string | undefined,
    role: string,
    filters: { status?: string; transfer_type?: string; search?: string },
  ): Promise<StockTransfer[]> {
    const qb = this.transferRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.requesting_branch', 'rb')
      .leftJoinAndSelect('t.source_branch', 'sb')
      .leftJoinAndSelect('t.requesting_warehouse', 'rw')
      .leftJoinAndSelect('t.source_warehouse', 'sw')
      .leftJoinAndSelect('t.items', 'items')
      .leftJoinAndSelect('items.spare_part', 'sp')
      .leftJoinAndSelect('items.product', 'pr')
      .leftJoinAndSelect('items.source_warehouse', 'isw')
      .leftJoinAndSelect('items.destination_warehouse', 'idw')
      .orderBy('t.created_at', 'DESC');

    // Non-admin: see transfers where their branch is either side
    if (role !== 'ADMIN' && branchId) {
      qb.where('t.requesting_branch_id = :branchId OR t.source_branch_id = :branchId', {
        branchId,
      });
    }

    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.transfer_type) {
      qb.andWhere('t.transfer_type = :transfer_type', { transfer_type: filters.transfer_type });
    }
    if (filters.search) {
      qb.andWhere('t.transfer_number ILIKE :search', { search: `%${filters.search}%` });
    }

    return qb.getMany();
  }

  async getById(id: string): Promise<StockTransfer> {
    const transfer = await this.transferRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.requesting_branch', 'rb')
      .leftJoinAndSelect('t.source_branch', 'sb')
      .leftJoinAndSelect('t.requesting_warehouse', 'rw')
      .leftJoinAndSelect('t.source_warehouse', 'sw')
      .leftJoinAndSelect('t.items', 'items')
      .leftJoinAndSelect('items.spare_part', 'sp')
      .leftJoinAndSelect('items.product', 'pr')
      .leftJoinAndSelect('items.source_warehouse', 'isw')
      .leftJoinAndSelect('items.destination_warehouse', 'idw')
      .where('t.id = :id', { id })
      .getOne();

    if (!transfer) throw new Error('Transfer not found');
    return transfer;
  }

  // Count of transfers needing attention for a given branch
  async getPendingCount(branchId: string | undefined, role: string): Promise<number> {
    if (role === 'ADMIN') {
      return this.transferRepo.count({ where: { status: TransferStatus.PENDING } });
    }
    if (!branchId) return 0;
    // Source branch: PENDING requests they need to respond to
    const pendingForSource = await this.transferRepo.count({
      where: { source_branch_id: branchId, status: TransferStatus.PENDING },
    });
    // Requesting branch: IN_TRANSIT items ready to receive
    const inTransitForDest = await this.transferRepo.count({
      where: { requesting_branch_id: branchId, status: TransferStatus.IN_TRANSIT },
    });
    return pendingForSource + inTransitForDest;
  }

  // Get branch inventory for all warehouses in a branch (for source manager's respond view)
  async getBranchInventory(branchId: string): Promise<Record<string, unknown>[]> {
    const result = await Source.query(
      `
      SELECT
        sp.id AS spare_part_id,
        sp.part_name,
        sp.item_code AS sku,
        w.id AS warehouse_id,
        w.warehouse_name,
        spi.quantity
      FROM spare_part_inventories spi
      JOIN spare_parts sp ON sp.id = spi.spare_part_id
      JOIN warehouses w ON w.id = spi.warehouse_id
      WHERE w.branch_id = $1 AND spi.quantity > 0
      ORDER BY sp.part_name, w.warehouse_name
    `,
      [branchId],
    );
    return result;
  }

  // Get products available in a branch (for source manager's respond view)
  async getBranchProducts(branchId: string): Promise<Record<string, unknown>[]> {
    const result = await Source.query(
      `
      SELECT
        p.id,
        p.serial_number,
        p.model_id,
        m.model_name,
        w.id AS warehouse_id,
        w.warehouse_name,
        p.status
      FROM products p
      JOIN warehouses w ON w.id = p.warehouse_id
      JOIN models m ON m.id = p.model_id
      WHERE w.branch_id = $1 AND p.status = 'AVAILABLE'
      ORDER BY m.model_name, p.serial_number
    `,
      [branchId],
    );
    return result;
  }
}

export const stockTransferService = new StockTransferService();
