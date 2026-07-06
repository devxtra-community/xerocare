import { Source } from '../config/db';
import { StockTransfer, TransferStatus, TransferType } from '../entities/stockTransferEntity';
import { StockTransferItem, TransferItemType } from '../entities/stockTransferItemEntity';
import { SparePartInventory } from '../entities/sparePartInventoryEntity';
import { Product } from '../entities/productEntity';
import { logger } from '../config/logger';

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://billing_service:4004';

export class StockTransferService {
  private transferRepo = Source.getRepository(StockTransfer);
  private itemRepo = Source.getRepository(StockTransferItem);
  private spInventoryRepo = Source.getRepository(SparePartInventory);
  private productRepo = Source.getRepository(Product);

  private async generateTransferNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `STR-${year}${month}-`;

    const latest = await this.transferRepo
      .createQueryBuilder('t')
      .where('t.transfer_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.transfer_number', 'DESC')
      .getOne();

    const seq = latest ? parseInt(latest.transfer_number.split('-')[2], 10) + 1 : 1;

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private async checkProductOnActiveLease(productId: string, serialNo: string): Promise<void> {
    try {
      const resp = await fetch(
        `${BILLING_SERVICE_URL}/invoices/machine/${productId}/billing-context`,
        { headers: { 'Content-Type': 'application/json' } },
      );
      if (!resp.ok) return; // billing service unavailable — allow optimistically

      const data = (await resp.json()) as { contractStatus?: string; customerName?: string };
      if (data.contractStatus === 'ACTIVE') {
        const who = data.customerName ? ` to ${data.customerName}` : '';
        throw new Error(
          `Machine ${serialNo} is currently on active lease${who} — cannot be transferred.`,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('cannot be transferred')) throw err;
      logger.warn(`Lease check failed for product ${productId}: ${(err as Error).message}`);
    }
  }

  async createDraft(
    body: {
      transfer_type: TransferType;
      source_branch_id: string;
      source_warehouse_id: string;
      destination_branch_id: string;
      destination_warehouse_id: string;
      reason: string;
      notes?: string;
      items: {
        item_type: TransferItemType;
        spare_part_id?: string;
        product_id?: string;
        requested_qty: number;
        unit_cost?: number;
      }[];
    },
    requestedById: string,
  ): Promise<StockTransfer> {
    if (
      body.transfer_type === TransferType.INTRA_BRANCH &&
      body.source_branch_id !== body.destination_branch_id
    ) {
      throw new Error('INTRA_BRANCH transfer must have same source and destination branch.');
    }
    if (
      body.transfer_type === TransferType.INTER_BRANCH &&
      body.source_branch_id === body.destination_branch_id
    ) {
      throw new Error('INTER_BRANCH transfer must have different source and destination branch.');
    }
    if (body.source_warehouse_id === body.destination_warehouse_id) {
      throw new Error('Source and destination warehouse must differ.');
    }
    if (!body.items || body.items.length === 0) {
      throw new Error('Transfer must have at least one item.');
    }

    for (const item of body.items) {
      if (item.item_type === TransferItemType.PRODUCT) {
        if (!item.product_id) throw new Error('product_id required for PRODUCT item.');
        const product = await this.productRepo.findOne({ where: { id: item.product_id } });
        if (!product) throw new Error(`Product ${item.product_id} not found.`);
        await this.checkProductOnActiveLease(product.id, product.serial_no);
        if (product.transfer_status && product.transfer_status !== 'NONE') {
          throw new Error(`Machine ${product.serial_no} is already committed to another transfer.`);
        }
        if (product.warehouse_id !== body.source_warehouse_id) {
          throw new Error(`Machine ${product.serial_no} is not in the selected source warehouse.`);
        }
      } else {
        if (!item.spare_part_id) throw new Error('spare_part_id required for SPARE_PART item.');
        const inv = await this.spInventoryRepo.findOne({
          where: { spare_part_id: item.spare_part_id, warehouse_id: body.source_warehouse_id },
        });
        const available = inv ? inv.quantity - inv.transfer_reserved_qty : 0;
        if (available < item.requested_qty) {
          throw new Error(
            `Insufficient stock for spare part ${item.spare_part_id}. Available: ${available}, Requested: ${item.requested_qty}.`,
          );
        }
      }
    }

    const transferNumber = await this.generateTransferNumber();

    return Source.transaction(async (manager) => {
      const transfer = manager.create(StockTransfer, {
        transfer_number: transferNumber,
        transfer_type: body.transfer_type,
        status: TransferStatus.DRAFT,
        source_branch_id: body.source_branch_id,
        source_warehouse_id: body.source_warehouse_id,
        destination_branch_id: body.destination_branch_id,
        destination_warehouse_id: body.destination_warehouse_id,
        requested_by_id: requestedById,
        reason: body.reason,
        notes: body.notes,
      });
      const saved = await manager.save(StockTransfer, transfer);

      const itemEntities = body.items.map((i) =>
        manager.create(StockTransferItem, {
          transfer_id: saved.id,
          item_type: i.item_type,
          spare_part_id: i.spare_part_id,
          product_id: i.product_id,
          requested_qty: i.requested_qty,
          unit_cost: i.unit_cost ?? 0,
        }),
      );
      await manager.save(StockTransferItem, itemEntities);

      return manager.findOneOrFail(StockTransfer, {
        where: { id: saved.id },
        relations: ['items'],
      });
    });
  }

  async submit(id: string, userId: string, userBranchId?: string): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    this.assertBranchAccess(transfer.source_branch_id, userBranchId);

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new Error(`Cannot submit transfer in status ${transfer.status}.`);
    }
    if (transfer.transfer_type === TransferType.INTRA_BRANCH) {
      // Intra-branch: skip approval, go straight to APPROVED and commit stock
      return this.doApprove(transfer, userId);
    }
    transfer.status = TransferStatus.PENDING_APPROVAL;
    return this.transferRepo.save(transfer);
  }

  async approve(
    id: string,
    userId: string,
    userBranchId?: string,
    role?: string,
  ): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    this.assertBranchAccess(transfer.source_branch_id, userBranchId);

    if (transfer.status !== TransferStatus.PENDING_APPROVAL) {
      throw new Error(`Cannot approve transfer in status ${transfer.status}.`);
    }
    // Manager cannot approve their own request — must be a different manager or Admin
    if (role !== 'ADMIN' && transfer.requested_by_id === userId) {
      throw new Error(
        'Cannot approve your own transfer request. Another manager or Admin must approve.',
      );
    }
    return this.doApprove(transfer, userId);
  }

  private async doApprove(transfer: StockTransfer, userId: string): Promise<StockTransfer> {
    const items = await this.itemRepo.find({ where: { transfer_id: transfer.id } });

    return Source.transaction(async (manager) => {
      for (const item of items) {
        if (item.item_type === TransferItemType.SPARE_PART && item.spare_part_id) {
          const inv = await manager.findOne(SparePartInventory, {
            where: {
              spare_part_id: item.spare_part_id,
              warehouse_id: transfer.source_warehouse_id,
            },
          });
          if (!inv)
            throw new Error(`Inventory record not found for spare part ${item.spare_part_id}.`);
          const available = inv.quantity - inv.transfer_reserved_qty;
          if (available < item.requested_qty) {
            throw new Error(
              `Insufficient stock for spare part ${item.spare_part_id}. Available: ${available}.`,
            );
          }
          inv.transfer_reserved_qty += item.requested_qty;
          await manager.save(SparePartInventory, inv);
        } else if (item.item_type === TransferItemType.PRODUCT && item.product_id) {
          const product = await manager.findOne(Product, { where: { id: item.product_id } });
          if (!product) throw new Error(`Product ${item.product_id} not found.`);
          product.transfer_status = 'COMMITTED';
          await manager.save(Product, product);
        }
      }

      transfer.status = TransferStatus.APPROVED;
      transfer.approved_by_id = userId;
      return manager.save(StockTransfer, transfer);
    });
  }

  async reject(
    id: string,
    userId: string,
    reason: string,
    userBranchId?: string,
  ): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    this.assertBranchAccess(transfer.source_branch_id, userBranchId);

    if (
      transfer.status !== TransferStatus.PENDING_APPROVAL &&
      transfer.status !== TransferStatus.APPROVED
    ) {
      throw new Error(`Cannot reject transfer in status ${transfer.status}.`);
    }
    await this.releaseCommittedStock(transfer);

    transfer.status = TransferStatus.REJECTED;
    transfer.rejection_reason = reason;
    return this.transferRepo.save(transfer);
  }

  async dispatch(id: string, userId: string, userBranchId?: string): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    this.assertBranchAccess(transfer.source_branch_id, userBranchId);

    if (transfer.status !== TransferStatus.APPROVED) {
      throw new Error(`Cannot dispatch transfer in status ${transfer.status}.`);
    }
    const items = await this.itemRepo.find({ where: { transfer_id: transfer.id } });

    return Source.transaction(async (manager) => {
      for (const item of items) {
        if (item.item_type === TransferItemType.SPARE_PART && item.spare_part_id) {
          const inv = await manager.findOne(SparePartInventory, {
            where: {
              spare_part_id: item.spare_part_id,
              warehouse_id: transfer.source_warehouse_id,
            },
          });
          if (!inv) throw new Error(`Inventory not found for spare part ${item.spare_part_id}.`);
          inv.quantity -= item.requested_qty;
          inv.transfer_reserved_qty = Math.max(0, inv.transfer_reserved_qty - item.requested_qty);
          await manager.save(SparePartInventory, inv);

          item.dispatched_qty = item.requested_qty;
          await manager.save(StockTransferItem, item);
        } else if (item.item_type === TransferItemType.PRODUCT && item.product_id) {
          const product = await manager.findOne(Product, { where: { id: item.product_id } });
          if (!product) throw new Error(`Product ${item.product_id} not found.`);
          product.transfer_status = 'IN_TRANSIT';
          await manager.save(Product, product);

          item.dispatched_qty = 1;
          await manager.save(StockTransferItem, item);
        }
      }

      transfer.status = TransferStatus.IN_TRANSIT;
      transfer.dispatched_at = new Date();
      return manager.save(StockTransfer, transfer);
    });
  }

  async receive(
    id: string,
    userId: string,
    receivedItems: { itemId: string; received_qty: number }[],
    userBranchId?: string,
  ): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    this.assertBranchAccess(transfer.destination_branch_id, userBranchId);

    if (
      transfer.status !== TransferStatus.IN_TRANSIT &&
      transfer.status !== TransferStatus.PARTIALLY_RECEIVED
    ) {
      throw new Error(`Cannot receive transfer in status ${transfer.status}.`);
    }
    const items = await this.itemRepo.find({ where: { transfer_id: transfer.id } });

    return Source.transaction(async (manager) => {
      for (const ri of receivedItems) {
        const item = items.find((i) => i.id === ri.itemId);
        if (!item) throw new Error(`Transfer item ${ri.itemId} not found.`);

        const prevReceived = item.received_qty ?? 0;
        const alreadyReceived = prevReceived;
        const dispatched = item.dispatched_qty ?? item.requested_qty;
        const remaining = dispatched - alreadyReceived;

        if (ri.received_qty > remaining) {
          throw new Error(
            `Cannot receive ${ri.received_qty} for item ${ri.itemId}. Remaining: ${remaining}.`,
          );
        }

        if (item.item_type === TransferItemType.SPARE_PART && item.spare_part_id) {
          let destInv = await manager.findOne(SparePartInventory, {
            where: {
              spare_part_id: item.spare_part_id,
              warehouse_id: transfer.destination_warehouse_id,
            },
          });
          if (!destInv) {
            destInv = manager.create(SparePartInventory, {
              spare_part_id: item.spare_part_id,
              warehouse_id: transfer.destination_warehouse_id,
              quantity: 0,
              transfer_reserved_qty: 0,
            });
          }
          destInv.quantity += ri.received_qty;
          await manager.save(SparePartInventory, destInv);
        } else if (item.item_type === TransferItemType.PRODUCT && item.product_id) {
          const product = await manager.findOne(Product, { where: { id: item.product_id } });
          if (!product) throw new Error(`Product ${item.product_id} not found.`);
          product.warehouse_id = transfer.destination_warehouse_id;
          product.transfer_status = 'NONE';
          await manager.save(Product, product);
        }

        item.received_qty = alreadyReceived + ri.received_qty;
        await manager.save(StockTransferItem, item);
      }

      // Recalculate total across all items
      const allItems = await manager.find(StockTransferItem, {
        where: { transfer_id: transfer.id },
      });
      const grandDispatched = allItems.reduce(
        (s, i) => s + (i.dispatched_qty ?? i.requested_qty),
        0,
      );
      const grandReceived = allItems.reduce((s, i) => s + (i.received_qty ?? 0), 0);

      if (grandReceived >= grandDispatched) {
        transfer.status = TransferStatus.COMPLETED;
      } else {
        transfer.status = TransferStatus.PARTIALLY_RECEIVED;
      }
      transfer.received_at = new Date();
      return manager.save(StockTransfer, transfer);
    });
  }

  async cancel(id: string, userId: string, userBranchId?: string): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);

    const cancellableStatuses = [
      TransferStatus.DRAFT,
      TransferStatus.PENDING_APPROVAL,
      TransferStatus.APPROVED,
    ];
    if (!cancellableStatuses.includes(transfer.status)) {
      throw new Error(`Cannot cancel transfer in status ${transfer.status}.`);
    }
    if (userBranchId) {
      const isSourceOrDest =
        transfer.source_branch_id === userBranchId ||
        transfer.destination_branch_id === userBranchId;
      if (!isSourceOrDest) {
        throw new Error('Access denied: not your branch transfer.');
      }
    }

    if (transfer.status === TransferStatus.APPROVED) {
      await this.releaseCommittedStock(transfer);
    }

    transfer.status = TransferStatus.CANCELLED;
    return this.transferRepo.save(transfer);
  }

  private async releaseCommittedStock(transfer: StockTransfer): Promise<void> {
    const items = await this.itemRepo.find({ where: { transfer_id: transfer.id } });

    await Source.transaction(async (manager) => {
      for (const item of items) {
        if (item.item_type === TransferItemType.SPARE_PART && item.spare_part_id) {
          const inv = await manager.findOne(SparePartInventory, {
            where: {
              spare_part_id: item.spare_part_id,
              warehouse_id: transfer.source_warehouse_id,
            },
          });
          if (inv) {
            inv.transfer_reserved_qty = Math.max(0, inv.transfer_reserved_qty - item.requested_qty);
            await manager.save(SparePartInventory, inv);
          }
        } else if (item.item_type === TransferItemType.PRODUCT && item.product_id) {
          const product = await manager.findOne(Product, { where: { id: item.product_id } });
          if (product) {
            product.transfer_status = 'NONE';
            await manager.save(Product, product);
          }
        }
      }
    });
  }

  async list(filters: {
    branchId?: string;
    status?: TransferStatus;
    transfer_type?: TransferType;
    dateFrom?: string;
    dateTo?: string;
    role?: string;
  }): Promise<StockTransfer[]> {
    const qb = this.transferRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.source_branch', 'sb')
      .leftJoinAndSelect('t.destination_branch', 'db')
      .leftJoinAndSelect('t.source_warehouse', 'sw')
      .leftJoinAndSelect('t.destination_warehouse', 'dw')
      .orderBy('t.created_at', 'DESC');

    if (filters.branchId && filters.role !== 'ADMIN') {
      qb.andWhere('(t.source_branch_id = :bid OR t.destination_branch_id = :bid)', {
        bid: filters.branchId,
      });
    }
    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.transfer_type) {
      qb.andWhere('t.transfer_type = :tt', { tt: filters.transfer_type });
    }
    if (filters.dateFrom) {
      qb.andWhere('t.created_at >= :from', { from: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('t.created_at <= :to', { to: filters.dateTo });
    }

    return qb.getMany();
  }

  async getById(id: string): Promise<StockTransfer | null> {
    return this.transferRepo.findOne({
      where: { id },
      relations: [
        'items',
        'items.spare_part',
        'items.product',
        'source_branch',
        'destination_branch',
        'source_warehouse',
        'destination_warehouse',
      ],
    });
  }

  async getPendingCount(branchId: string, role: string): Promise<number> {
    const qb = this.transferRepo.createQueryBuilder('t');

    if (role === 'ADMIN') {
      qb.where('t.status IN (:...statuses)', {
        statuses: [TransferStatus.PENDING_APPROVAL, TransferStatus.IN_TRANSIT],
      });
    } else {
      qb.where(
        `(
          (t.source_branch_id = :bid AND t.status = :approved) OR
          (t.destination_branch_id = :bid AND t.status IN (:...inboundStatuses))
        )`,
        {
          bid: branchId,
          approved: TransferStatus.PENDING_APPROVAL,
          inboundStatuses: [TransferStatus.IN_TRANSIT, TransferStatus.PARTIALLY_RECEIVED],
        },
      );
    }
    return qb.getCount();
  }

  private async getByIdOrFail(id: string): Promise<StockTransfer> {
    const transfer = await this.transferRepo.findOne({ where: { id } });
    if (!transfer) throw new Error(`Transfer ${id} not found.`);
    return transfer;
  }

  private assertBranchAccess(transferBranchId: string, userBranchId?: string): void {
    if (!userBranchId) return; // ADMIN has no branchId — always allowed
    if (transferBranchId !== userBranchId) {
      throw new Error('Access denied: not your branch transfer.');
    }
  }
}
