import { In, EntityManager } from 'typeorm';
import { Source } from '../config/db';
import { StockTransfer, TransferStatus, TransferType } from '../entities/stockTransferEntity';
import {
  StockTransferItem,
  TransferItemType,
  TransferItemStatus,
} from '../entities/stockTransferItemEntity';
import { SparePart } from '../entities/sparePartEntity';
import { Product, ProductStatus } from '../entities/productEntity';
import { Model } from '../entities/modelEntity';
import { Warehouse } from '../entities/warehouseEntity';
import { Branch } from '../entities/branchEntity';
import { Lot, LotStatus } from '../entities/lotEntity';
import { LotItem, LotItemType } from '../entities/lotItemEntity';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { generateSku } from '../utils/skuGenerator';
import { getExchangeRate } from '../utils/exchangeRate';
import { logger } from '../config/logger';

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://billing_service:4004';

export interface CreateTransferBody {
  transfer_type: TransferType;
  source_branch_id: string;
  source_warehouse_id?: string;
  destination_branch_id: string;
  destination_warehouse_id: string;
  reason: string;
  notes?: string;
  items: {
    item_type: TransferItemType;
    spare_part_id?: string;
    model_id?: string;
    product_id?: string;
    requested_qty: number;
  }[];
}

export interface ApproveLine {
  item_id: string;
  approved_qty: number;
  assigned_product_ids?: string[];
}

export class StockTransferService {
  private transferRepo = Source.getRepository(StockTransfer);
  private itemRepo = Source.getRepository(StockTransferItem);
  private sparePartRepo = Source.getRepository(SparePart);
  private productRepo = Source.getRepository(Product);
  private warehouseRepo = Source.getRepository(Warehouse);
  private branchRepo = Source.getRepository(Branch);

  // ---------------------------------------------------------------- helpers

  private async generateTransferNumber(): Promise<string> {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `STR-${ym}-`;
    const latest = await this.transferRepo
      .createQueryBuilder('t')
      .where('t.transfer_number LIKE :p', { p: `${prefix}%` })
      .orderBy('t.transfer_number', 'DESC')
      .getOne();
    const next = latest ? parseInt(latest.transfer_number.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
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

  private async getBranchWarehouseIds(branchId: string): Promise<string[]> {
    const warehouses = await this.warehouseRepo.find({ where: { branchId } });
    return warehouses.map((w) => w.id);
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private async notify(
    recipientId: string | undefined,
    title: string,
    message: string,
    transferId: string,
  ): Promise<void> {
    if (!recipientId) return;
    await NotificationPublisher.publishInAppRequest({
      recipientId,
      title,
      message,
      type: 'STOCK_TRANSFER',
      referenceId: transferId,
      referenceType: 'STOCK_TRANSFER',
    });
  }

  private async getByIdOrFail(id: string): Promise<StockTransfer> {
    const transfer = await this.transferRepo.findOne({ where: { id } });
    if (!transfer) throw new Error(`Transfer ${id} not found.`);
    return transfer;
  }

  private assertBranch(branchId: string, userBranchId?: string): void {
    if (!userBranchId) return; // ADMIN has no branchId — always allowed
    if (branchId !== userBranchId) {
      throw new Error('Access denied: not your branch transfer.');
    }
  }

  /** Count of machines of a model free to transfer inside a set of warehouses. */
  private availableProductsQb(modelId: string, warehouseIds: string[]) {
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.model_id = :modelId', { modelId })
      .andWhere('p.warehouse_id IN (:...whIds)', { whIds: warehouseIds })
      .andWhere('p.product_status = :st', { st: ProductStatus.AVAILABLE })
      .andWhere("(p.transfer_status IS NULL OR p.transfer_status = 'NONE')");
  }

  // ---------------------------------------------------------------- create

  async createDraft(body: CreateTransferBody, requestedById: string): Promise<StockTransfer> {
    if (!body.items || body.items.length === 0) {
      throw new Error('Transfer must have at least one item.');
    }
    if (!body.destination_warehouse_id) {
      throw new Error('Destination warehouse is required.');
    }

    if (body.transfer_type === TransferType.INTRA_BRANCH) {
      if (body.source_branch_id !== body.destination_branch_id) {
        throw new Error('INTRA_BRANCH transfer must stay within one branch.');
      }
      if (!body.source_warehouse_id) {
        throw new Error('INTRA_BRANCH transfer requires a source warehouse.');
      }
      if (body.source_warehouse_id === body.destination_warehouse_id) {
        throw new Error('Source and destination warehouse must differ.');
      }
      await this.validateIntraItems(body);
    } else {
      if (body.source_branch_id === body.destination_branch_id) {
        throw new Error('INTER_BRANCH transfer must target a different branch.');
      }
      await this.validateInterItems(body);
    }

    const transferNumber = await this.generateTransferNumber();

    return Source.transaction(async (manager) => {
      const transfer = manager.create(StockTransfer, {
        transfer_number: transferNumber,
        transfer_type: body.transfer_type,
        status: TransferStatus.DRAFT,
        source_branch_id: body.source_branch_id,
        source_warehouse_id:
          body.transfer_type === TransferType.INTRA_BRANCH ? body.source_warehouse_id : undefined,
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
          model_id: i.model_id,
          product_id: i.product_id,
          requested_qty: i.requested_qty,
          item_status: TransferItemStatus.PENDING,
          source_warehouse_id:
            body.transfer_type === TransferType.INTRA_BRANCH ? body.source_warehouse_id : undefined,
        }),
      );
      await manager.save(StockTransferItem, itemEntities);

      return manager.findOneOrFail(StockTransfer, {
        where: { id: saved.id },
        relations: ['items'],
      });
    });
  }

  private async validateIntraItems(body: CreateTransferBody): Promise<void> {
    for (const item of body.items) {
      if (item.item_type === TransferItemType.PRODUCT) {
        if (!item.product_id) throw new Error('product_id required for INTRA product line.');
        if (item.requested_qty !== 1) {
          throw new Error('Serialized machines transfer one per line (qty must be 1).');
        }
        const product = await this.productRepo.findOne({ where: { id: item.product_id } });
        if (!product) throw new Error(`Product ${item.product_id} not found.`);
        if (product.warehouse_id !== body.source_warehouse_id) {
          throw new Error(`Machine ${product.serial_no} is not in the selected source warehouse.`);
        }
        if (product.product_status !== ProductStatus.AVAILABLE) {
          throw new Error(`Machine ${product.serial_no} is ${product.product_status} — not free.`);
        }
        if (product.transfer_status && product.transfer_status !== 'NONE') {
          throw new Error(`Machine ${product.serial_no} is already in another transfer.`);
        }
        await this.checkProductOnActiveLease(product.id, product.serial_no);
      } else {
        if (!item.spare_part_id) throw new Error('spare_part_id required for spare-part line.');
        const part = await this.sparePartRepo.findOne({ where: { id: item.spare_part_id } });
        if (!part) throw new Error('Spare part not found.');
        if (
          part.branch_id !== body.source_branch_id ||
          (part.warehouse_id && part.warehouse_id !== body.source_warehouse_id)
        ) {
          throw new Error(`Spare part ${part.part_name} is not in the source warehouse.`);
        }
        const available = part.quantity - part.reserved_quantity;
        if (available < item.requested_qty) {
          throw new Error(
            `Insufficient stock for ${part.part_name}. Available: ${available}, requested: ${item.requested_qty}.`,
          );
        }
      }
    }
  }

  private async validateInterItems(body: CreateTransferBody): Promise<void> {
    const sourceWhIds = await this.getBranchWarehouseIds(body.source_branch_id);
    if (sourceWhIds.length === 0) {
      throw new Error('Source branch has no warehouses.');
    }
    for (const item of body.items) {
      if (item.item_type === TransferItemType.PRODUCT) {
        if (!item.model_id) {
          throw new Error('model_id required for INTER product line (request by model).');
        }
        const available = await this.availableProductsQb(item.model_id, sourceWhIds).getCount();
        if (available < item.requested_qty) {
          throw new Error(
            `Only ${available} machine(s) of the requested model are free at the source branch.`,
          );
        }
      } else {
        if (!item.spare_part_id) throw new Error('spare_part_id required for spare-part line.');
        const part = await this.sparePartRepo.findOne({ where: { id: item.spare_part_id } });
        if (!part) throw new Error('Spare part not found.');
        if (part.branch_id !== body.source_branch_id) {
          throw new Error(`Spare part ${part.part_name} does not belong to the source branch.`);
        }
        const available = part.quantity - part.reserved_quantity;
        if (available < item.requested_qty) {
          throw new Error(
            `Insufficient branch stock for ${part.part_name}. Available: ${available}, requested: ${item.requested_qty}.`,
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------- submit (INTER)

  async submit(id: string, userId: string, userBranchId?: string): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    if (transfer.transfer_type !== TransferType.INTER_BRANCH) {
      throw new Error('Only inter-branch requests are submitted; intra-branch uses dispatch.');
    }
    // The requester belongs to the destination branch.
    this.assertBranch(transfer.destination_branch_id, userBranchId);
    if (transfer.status !== TransferStatus.DRAFT) {
      throw new Error(`Cannot submit transfer in status ${transfer.status}.`);
    }

    transfer.status = TransferStatus.SENT;
    const saved = await this.transferRepo.save(transfer);

    const [sourceBranch, destBranch] = await Promise.all([
      this.branchRepo.findOne({ where: { id: transfer.source_branch_id } }),
      this.branchRepo.findOne({ where: { id: transfer.destination_branch_id } }),
    ]);
    await this.notify(
      sourceBranch?.manager_id,
      'Stock transfer request received',
      `${destBranch?.name ?? 'A branch'} requested items (${transfer.transfer_number}). Review and approve.`,
      transfer.id,
    );
    return saved;
  }

  // ---------------------------------------------------------------- approve / reject (INTER)

  async approve(
    id: string,
    userId: string,
    lines: ApproveLine[],
    userBranchId?: string,
    role?: string,
  ): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    if (transfer.transfer_type !== TransferType.INTER_BRANCH) {
      throw new Error('Only inter-branch requests need approval.');
    }
    this.assertBranch(transfer.source_branch_id, userBranchId);
    if (transfer.status !== TransferStatus.SENT) {
      throw new Error(`Cannot approve transfer in status ${transfer.status}.`);
    }
    if (role !== 'ADMIN' && transfer.requested_by_id === userId) {
      throw new Error('Cannot approve your own request.');
    }

    const items = await this.itemRepo.find({ where: { transfer_id: transfer.id } });
    const lineByItem = new Map(lines?.map((l) => [l.item_id, l]) ?? []);
    const sourceWhIds = await this.getBranchWarehouseIds(transfer.source_branch_id);

    const result = await Source.transaction(async (manager) => {
      let approvedCount = 0;

      for (const item of items) {
        const line = lineByItem.get(item.id);
        const approvedQty = line ? line.approved_qty : item.requested_qty;

        if (approvedQty <= 0) {
          item.approved_qty = 0;
          item.item_status = TransferItemStatus.REJECTED;
          await manager.save(StockTransferItem, item);
          continue;
        }
        if (approvedQty > item.requested_qty) {
          throw new Error('Approved quantity cannot exceed requested quantity.');
        }

        if (item.item_type === TransferItemType.PRODUCT) {
          const assigned = line?.assigned_product_ids ?? [];
          if (assigned.length !== approvedQty) {
            throw new Error(
              `Assign exactly ${approvedQty} serial number(s) for each approved machine line.`,
            );
          }
          const products = await manager.find(Product, { where: { id: In(assigned) } });
          if (products.length !== assigned.length) {
            throw new Error('One or more assigned machines were not found.');
          }
          for (const product of products) {
            if (product.model_id !== item.model_id) {
              throw new Error(`Machine ${product.serial_no} is a different model than requested.`);
            }
            if (!sourceWhIds.includes(product.warehouse_id)) {
              throw new Error(`Machine ${product.serial_no} is not in this branch.`);
            }
            if (product.product_status !== ProductStatus.AVAILABLE) {
              throw new Error(`Machine ${product.serial_no} is not available.`);
            }
            if (product.transfer_status && product.transfer_status !== 'NONE') {
              throw new Error(`Machine ${product.serial_no} is already in another transfer.`);
            }
            await this.checkProductOnActiveLease(product.id, product.serial_no);
            product.transfer_status = 'COMMITTED';
            await manager.save(Product, product);
          }
          item.assigned_product_ids = assigned;
        } else if (item.spare_part_id) {
          const part = await manager.findOne(SparePart, { where: { id: item.spare_part_id } });
          if (!part) throw new Error('Spare part not found.');
          const available = part.quantity - part.reserved_quantity;
          if (available < approvedQty) {
            throw new Error(
              `Insufficient stock for ${part.part_name}. Available: ${available}. Approve a lower quantity.`,
            );
          }
          // Reserve on the part row — same mechanism the service module uses.
          part.reserved_quantity += approvedQty;
          await manager.save(SparePart, part);
          item.source_warehouse_id = part.warehouse_id ?? undefined;
        }

        item.approved_qty = approvedQty;
        item.item_status = TransferItemStatus.APPROVED;
        await manager.save(StockTransferItem, item);
        approvedCount++;
      }

      if (approvedCount === 0) {
        transfer.status = TransferStatus.REJECTED;
        transfer.rejection_reason = 'All requested items were rejected.';
        transfer.approved_by_id = userId;
        return manager.save(StockTransfer, transfer);
      }

      const lot = await this.createTransferLot(manager, transfer, items, userId);
      transfer.lot_id = lot.id;
      transfer.status = TransferStatus.APPROVED;
      transfer.approved_by_id = userId;
      return manager.save(StockTransfer, transfer);
    });

    // Notify the requester with a per-line breakdown of what changed.
    const summary = items
      .map((i) => {
        const label = i.item_type === TransferItemType.PRODUCT ? 'Machines' : 'Spare part';
        if (i.item_status === TransferItemStatus.REJECTED) return `${label}: rejected`;
        if ((i.approved_qty ?? 0) < i.requested_qty)
          return `${label}: ${i.approved_qty}/${i.requested_qty} approved`;
        return null;
      })
      .filter(Boolean)
      .join('; ');
    await this.notify(
      transfer.requested_by_id,
      result.status === TransferStatus.REJECTED
        ? 'Stock transfer rejected'
        : 'Stock transfer approved',
      result.status === TransferStatus.REJECTED
        ? `${transfer.transfer_number}: all items rejected.`
        : `${transfer.transfer_number} approved${summary ? ` with changes — ${summary}` : ''}. A receiving lot has been created.`,
      transfer.id,
    );

    return result;
  }

  async reject(
    id: string,
    userId: string,
    reason: string,
    userBranchId?: string,
  ): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    this.assertBranch(transfer.source_branch_id, userBranchId);
    if (transfer.status !== TransferStatus.SENT) {
      throw new Error(`Cannot reject transfer in status ${transfer.status}.`);
    }

    await this.itemRepo.update(
      { transfer_id: transfer.id },
      { item_status: TransferItemStatus.REJECTED },
    );
    transfer.status = TransferStatus.REJECTED;
    transfer.rejection_reason = reason;
    transfer.approved_by_id = userId;
    const saved = await this.transferRepo.save(transfer);

    await this.notify(
      transfer.requested_by_id,
      'Stock transfer rejected',
      `${transfer.transfer_number} was rejected: ${reason}`,
      transfer.id,
    );
    return saved;
  }

  // ---------------------------------------------------------------- lot creation

  /**
   * Lot pricing rules:
   * - INTRA: full details travel with the stock — purchase price as unit price,
   *   sale price carried along. No conversion (same branch, same currency).
   * - INTER: purchase price only, converted to the destination branch currency
   *   at the live rate (snapshotted on the lot). Sale/wholesale prices are set
   *   by the receiving manager afterwards.
   */
  private async createTransferLot(
    manager: EntityManager,
    transfer: StockTransfer,
    items: StockTransferItem[],
    userId: string,
  ): Promise<Lot> {
    const isInter = transfer.transfer_type === TransferType.INTER_BRANCH;
    const [sourceBranch, destBranch] = await Promise.all([
      manager.findOne(Branch, { where: { id: transfer.source_branch_id } }),
      manager.findOne(Branch, { where: { id: transfer.destination_branch_id } }),
    ]);
    const rate = isInter
      ? (await getExchangeRate(manager, sourceBranch?.currency_code, destBranch?.currency_code))
          .rate
      : 1;

    const lot = manager.create(Lot, {
      lotNumber: `TRF-${transfer.transfer_number}`,
      purchaseDate: new Date(),
      status: LotStatus.PENDING,
      totalAmount: 0,
      transferOrigin: true,
      transferId: transfer.id,
      branch_id: transfer.destination_branch_id,
      warehouse_id: transfer.destination_warehouse_id,
      createdBy: userId,
      currencyCode: destBranch?.currency_code,
      exchangeRateSnapshot: isInter ? rate : undefined,
      notes: `Internal stock transfer ${transfer.transfer_number}`,
    });
    const savedLot = await manager.save(Lot, lot);

    const lotItems: LotItem[] = [];
    let totalAmount = 0;
    for (const item of items) {
      if (item.item_status === TransferItemStatus.REJECTED) continue;
      const qty = item.approved_qty ?? item.requested_qty;
      let unitPrice = 0;
      let sellingPrice = 0;

      if (item.item_type === TransferItemType.PRODUCT) {
        // INTRA lines carry a specific machine; INTER lines carry assigned machines of a model.
        const productIds = item.assigned_product_ids?.length
          ? item.assigned_product_ids
          : item.product_id
            ? [item.product_id]
            : [];
        const products = productIds.length
          ? await manager.find(Product, { where: { id: In(productIds) } })
          : [];
        const modelId = item.model_id ?? products[0]?.model_id;
        if (!modelId) continue;

        if (products.length > 0) {
          const avgPurchase =
            products.reduce((s, p) => s + Number(p.purchase_price ?? 0), 0) / products.length;
          unitPrice = this.round2(avgPurchase * rate);
          sellingPrice = isInter ? 0 : this.round2(Number(products[0].sale_price ?? 0));
        }
        lotItems.push(
          manager.create(LotItem, {
            lotId: savedLot.id,
            itemType: LotItemType.MODEL,
            modelId,
            expectedQuantity: qty,
            receivedQuantity: 0,
            damagedQuantity: 0,
            returnedQuantity: 0,
            unitPrice,
            sellingPrice,
            totalPrice: this.round2(unitPrice * qty),
          }),
        );
      } else if (item.spare_part_id) {
        const part = await manager.findOne(SparePart, { where: { id: item.spare_part_id } });
        unitPrice = this.round2(Number(part?.purchase_price ?? 0) * rate);
        sellingPrice = isInter ? 0 : this.round2(Number(part?.base_price ?? 0));
        lotItems.push(
          manager.create(LotItem, {
            lotId: savedLot.id,
            itemType: LotItemType.SPARE_PART,
            sparePartId: item.spare_part_id,
            expectedQuantity: qty,
            receivedQuantity: 0,
            damagedQuantity: 0,
            returnedQuantity: 0,
            unitPrice,
            sellingPrice,
            totalPrice: this.round2(unitPrice * qty),
          }),
        );
      }

      // Keep the (converted) purchase cost on the transfer line for display.
      item.unit_cost = unitPrice;
      await manager.save(StockTransferItem, item);
      totalAmount += this.round2(unitPrice * qty);
    }
    if (lotItems.length > 0) await manager.save(LotItem, lotItems);

    savedLot.totalAmount = this.round2(totalAmount);
    return manager.save(Lot, savedLot);
  }

  // ---------------------------------------------------------------- dispatch

  async dispatch(id: string, userId: string, userBranchId?: string): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    this.assertBranch(transfer.source_branch_id, userBranchId);
    const items = await this.itemRepo.find({ where: { transfer_id: transfer.id } });

    if (transfer.transfer_type === TransferType.INTRA_BRANCH) {
      if (transfer.status !== TransferStatus.DRAFT) {
        throw new Error(`Cannot dispatch intra-branch transfer in status ${transfer.status}.`);
      }
      return this.dispatchIntra(transfer, items, userId);
    }

    if (transfer.status !== TransferStatus.APPROVED) {
      throw new Error(`Cannot dispatch transfer in status ${transfer.status}.`);
    }
    return this.dispatchInter(transfer, items);
  }

  private async dispatchIntra(
    transfer: StockTransfer,
    items: StockTransferItem[],
    userId: string,
  ): Promise<StockTransfer> {
    const result = await Source.transaction(async (manager) => {
      for (const item of items) {
        if (item.item_type === TransferItemType.PRODUCT && item.product_id) {
          const product = await manager.findOne(Product, { where: { id: item.product_id } });
          if (!product) throw new Error(`Machine not found for a transfer line.`);
          if (product.warehouse_id !== transfer.source_warehouse_id) {
            throw new Error(`Machine ${product.serial_no} is no longer in the source warehouse.`);
          }
          if (product.transfer_status && product.transfer_status !== 'NONE') {
            throw new Error(`Machine ${product.serial_no} is already in another transfer.`);
          }
          product.transfer_status = 'IN_TRANSIT';
          await manager.save(Product, product);
          item.dispatched_qty = 1;
        } else if (item.spare_part_id) {
          const part = await manager.findOne(SparePart, { where: { id: item.spare_part_id } });
          if (!part) throw new Error('Spare part not found for a transfer line.');
          const available = part.quantity - part.reserved_quantity;
          if (available < item.requested_qty) {
            throw new Error(
              `Insufficient stock for ${part.part_name} (available ${available}, needed ${item.requested_qty}).`,
            );
          }
          part.quantity -= item.requested_qty;
          await manager.save(SparePart, part);
          item.dispatched_qty = item.requested_qty;
        }
        item.approved_qty = item.requested_qty;
        item.item_status = TransferItemStatus.APPROVED;
        await manager.save(StockTransferItem, item);
      }

      const lot = await this.createTransferLot(manager, transfer, items, userId);
      transfer.lot_id = lot.id;
      transfer.status = TransferStatus.IN_TRANSIT;
      transfer.dispatched_at = new Date();
      return manager.save(StockTransfer, transfer);
    });
    return result;
  }

  private async dispatchInter(
    transfer: StockTransfer,
    items: StockTransferItem[],
  ): Promise<StockTransfer> {
    const result = await Source.transaction(async (manager) => {
      for (const item of items) {
        if (item.item_status !== TransferItemStatus.APPROVED) continue;
        const qty = item.approved_qty ?? 0;

        if (item.item_type === TransferItemType.PRODUCT) {
          for (const productId of item.assigned_product_ids ?? []) {
            const product = await manager.findOne(Product, { where: { id: productId } });
            if (!product) throw new Error('An assigned machine was not found.');
            product.transfer_status = 'IN_TRANSIT';
            await manager.save(Product, product);
          }
          item.dispatched_qty = qty;
        } else if (item.spare_part_id) {
          const part = await manager.findOne(SparePart, { where: { id: item.spare_part_id } });
          if (!part) throw new Error('Reserved spare part not found.');
          part.quantity -= qty;
          part.reserved_quantity = Math.max(0, part.reserved_quantity - qty);
          await manager.save(SparePart, part);
          item.dispatched_qty = qty;
        }
        await manager.save(StockTransferItem, item);
      }

      transfer.status = TransferStatus.IN_TRANSIT;
      transfer.dispatched_at = new Date();
      return manager.save(StockTransfer, transfer);
    });

    await this.notify(
      transfer.requested_by_id,
      'Stock transfer dispatched',
      `${transfer.transfer_number} is on its way. Receive it via lot TRF-${transfer.transfer_number}.`,
      transfer.id,
    );
    return result;
  }

  // ---------------------------------------------------------------- completion (from lot confirm)

  /**
   * Called by the lot service when a transfer-origin lot is confirmed received.
   * Moves the stock: machines change warehouse, spare parts move between inventories
   * (creating a matching spare part at the destination branch when needed).
   */
  async completeFromLot(lotId: string, manager: EntityManager): Promise<void> {
    const transfer = await manager.findOne(StockTransfer, { where: { lot_id: lotId } });
    if (!transfer) return;
    if (transfer.status === TransferStatus.COMPLETED) return;
    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new Error('Transfer goods have not been dispatched yet — cannot confirm receipt.');
    }

    const items = await manager.find(StockTransferItem, {
      where: { transfer_id: transfer.id },
    });

    const isInter = transfer.transfer_type === TransferType.INTER_BRANCH;
    // Rate snapshotted on the lot at approval — keeps lot and stock figures consistent.
    const lot = await manager.findOne(Lot, { where: { id: lotId } });
    const rate = isInter ? Number(lot?.exchangeRateSnapshot ?? 1) : 1;

    for (const item of items) {
      if (item.item_status !== TransferItemStatus.APPROVED) continue;
      const qty = item.dispatched_qty ?? item.approved_qty ?? item.requested_qty;

      if (item.item_type === TransferItemType.PRODUCT) {
        const productIds = item.assigned_product_ids?.length
          ? item.assigned_product_ids
          : item.product_id
            ? [item.product_id]
            : [];
        for (const productId of productIds) {
          const product = await manager.findOne(Product, { where: { id: productId } });
          if (!product) continue;
          product.warehouse_id = transfer.destination_warehouse_id;
          product.transfer_status = 'NONE';
          if (isInter) {
            // Purchase cost lands in the destination branch currency;
            // sale/wholesale prices are set by the receiving manager.
            product.purchase_price = this.round2(Number(product.purchase_price ?? 0) * rate);
            product.sale_price = 0;
            product.wholesale_price = 0;
          }
          await manager.save(Product, product);
        }
      } else if (item.spare_part_id) {
        // Stock lands on the matching spare-part row at the destination warehouse
        // (spare parts are one row per branch+warehouse; created if missing).
        const destPart = await this.resolveDestSparePart(
          manager,
          item.spare_part_id,
          transfer.destination_branch_id,
          transfer.destination_warehouse_id,
          isInter,
          rate,
        );
        destPart.quantity += qty;
        await manager.save(SparePart, destPart);
      }

      item.received_qty = qty;
      await manager.save(StockTransferItem, item);
    }

    transfer.status = TransferStatus.COMPLETED;
    transfer.received_at = new Date();
    await manager.save(StockTransfer, transfer);

    // Notify outside callers can't await this transaction; fire-and-forget is fine here.
    const sourceBranch = await manager.findOne(Branch, {
      where: { id: transfer.source_branch_id },
    });
    void this.notify(
      sourceBranch?.manager_id,
      'Stock transfer received',
      `${transfer.transfer_number} was received by the requesting branch.`,
      transfer.id,
    );
  }

  /**
   * Find or create the matching spare-part row at the destination branch+warehouse
   * (rows are scoped per branch and warehouse; same part+brand+model matches).
   * INTRA carries all pricing over unchanged; INTER carries the converted purchase
   * price only — the receiving manager sets sale/wholesale prices.
   * When the destination row already exists its prices are left untouched.
   */
  private async resolveDestSparePart(
    manager: EntityManager,
    sourcePartId: string,
    destBranchId: string,
    destWarehouseId: string,
    isInter: boolean,
    rate: number,
  ): Promise<SparePart> {
    const sourcePart = await manager.findOne(SparePart, { where: { id: sourcePartId } });
    if (!sourcePart) throw new Error('Source spare part not found.');
    if (sourcePart.branch_id === destBranchId && sourcePart.warehouse_id === destWarehouseId) {
      return sourcePart;
    }

    const qb = manager
      .getRepository(SparePart)
      .createQueryBuilder('sp')
      .where('LOWER(sp.part_name) = LOWER(:name)', { name: sourcePart.part_name })
      .andWhere('LOWER(sp.brand) = LOWER(:brand)', { brand: sourcePart.brand })
      .andWhere('sp.branch_id = :bid', { bid: destBranchId })
      .andWhere('sp.warehouse_id = :wid', { wid: destWarehouseId });
    if (sourcePart.model_id) {
      qb.andWhere('sp.model_id = :mid', { mid: sourcePart.model_id });
    } else {
      qb.andWhere('sp.model_id IS NULL');
    }
    const existing = await qb.getOne();
    if (existing) return existing;

    const created = manager.create(SparePart, {
      sku: generateSku(),
      part_name: sourcePart.part_name,
      brand: sourcePart.brand,
      branch_id: destBranchId,
      warehouse_id: destWarehouseId,
      model_id: sourcePart.model_id,
      purchase_price: this.round2(Number(sourcePart.purchase_price ?? 0) * rate),
      base_price: isInter ? 0 : sourcePart.base_price,
      wholesale_price: isInter ? 0 : sourcePart.wholesale_price,
      tax_rate: isInter ? 0 : sourcePart.tax_rate,
      max_discount_amount: isInter ? null : sourcePart.max_discount_amount,
      quantity: 0,
      reserved_quantity: 0,
    });
    return manager.save(SparePart, created);
  }

  // ---------------------------------------------------------------- cancel

  async cancel(id: string, userId: string, userBranchId?: string): Promise<StockTransfer> {
    const transfer = await this.getByIdOrFail(id);
    const cancellable = [TransferStatus.DRAFT, TransferStatus.SENT, TransferStatus.APPROVED];
    if (!cancellable.includes(transfer.status)) {
      throw new Error(`Cannot cancel transfer in status ${transfer.status}.`);
    }
    if (userBranchId) {
      const mine =
        transfer.source_branch_id === userBranchId ||
        transfer.destination_branch_id === userBranchId;
      if (!mine) throw new Error('Access denied: not your branch transfer.');
    }

    const wasApproved = transfer.status === TransferStatus.APPROVED;
    const result = await Source.transaction(async (manager) => {
      if (wasApproved) {
        const items = await manager.find(StockTransferItem, {
          where: { transfer_id: transfer.id },
        });
        for (const item of items) {
          if (item.item_status !== TransferItemStatus.APPROVED) continue;
          if (item.item_type === TransferItemType.PRODUCT) {
            for (const productId of item.assigned_product_ids ?? []) {
              const product = await manager.findOne(Product, { where: { id: productId } });
              if (product) {
                product.transfer_status = 'NONE';
                await manager.save(Product, product);
              }
            }
          } else if (item.spare_part_id) {
            const part = await manager.findOne(SparePart, { where: { id: item.spare_part_id } });
            if (part) {
              part.reserved_quantity = Math.max(
                0,
                part.reserved_quantity - (item.approved_qty ?? 0),
              );
              await manager.save(SparePart, part);
            }
          }
        }
        if (transfer.lot_id) {
          await manager.update(Lot, { id: transfer.lot_id }, { status: LotStatus.CANCELLED });
        }
      }
      transfer.status = TransferStatus.CANCELLED;
      return manager.save(StockTransfer, transfer);
    });

    if (transfer.transfer_type === TransferType.INTER_BRANCH) {
      const sourceBranch = await this.branchRepo.findOne({
        where: { id: transfer.source_branch_id },
      });
      const other =
        userBranchId === transfer.source_branch_id
          ? transfer.requested_by_id
          : sourceBranch?.manager_id;
      await this.notify(
        other,
        'Stock transfer cancelled',
        `${transfer.transfer_number} was cancelled.`,
        transfer.id,
      );
    }
    return result;
  }

  // ---------------------------------------------------------------- queries

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
    if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    if (filters.transfer_type) qb.andWhere('t.transfer_type = :tt', { tt: filters.transfer_type });
    if (filters.dateFrom) qb.andWhere('t.created_at >= :from', { from: filters.dateFrom });
    if (filters.dateTo) qb.andWhere('t.created_at <= :to', { to: filters.dateTo });

    return qb.getMany();
  }

  async getById(id: string): Promise<StockTransfer | null> {
    const transfer = await this.transferRepo.findOne({
      where: { id },
      relations: [
        'items',
        'items.spare_part',
        'items.product',
        'items.model',
        'items.model.brandRelation',
        'source_branch',
        'destination_branch',
        'source_warehouse',
        'destination_warehouse',
      ],
    });
    if (transfer?.lot_id) {
      const lot = await Source.getRepository(Lot).findOne({ where: { id: transfer.lot_id } });
      if (lot) {
        transfer.lot = {
          id: lot.id,
          lotNumber: lot.lotNumber,
          status: lot.status,
          currencyCode: lot.currencyCode,
          exchangeRateSnapshot:
            lot.exchangeRateSnapshot != null ? Number(lot.exchangeRateSnapshot) : undefined,
        };
      }
    }
    return transfer;
  }

  async getPendingCount(branchId: string, role: string): Promise<number> {
    const qb = this.transferRepo.createQueryBuilder('t');
    if (role === 'ADMIN') {
      qb.where('t.status IN (:...statuses)', {
        statuses: [TransferStatus.SENT, TransferStatus.IN_TRANSIT],
      });
    } else {
      qb.where(
        `(
          (t.source_branch_id = :bid AND t.status = :sent) OR
          (t.destination_branch_id = :bid AND t.status = :transit)
        )`,
        { bid: branchId, sent: TransferStatus.SENT, transit: TransferStatus.IN_TRANSIT },
      );
    }
    return qb.getCount();
  }

  /**
   * Inventory listing used by the wizard and the approval screen.
   * With warehouseId (INTRA): specific machines + per-warehouse spare stock.
   * Without (INTER): models with free-machine counts + branch-wide spare stock.
   */
  async getBranchInventory(
    branchId: string,
    warehouseId?: string,
  ): Promise<{
    models: {
      model_id: string;
      model_no: string;
      model_name: string;
      brand: string | null;
      available: number;
    }[];
    products: { id: string; serial_no: string; model_id: string; model_name: string }[];
    spare_parts: {
      spare_part_id: string;
      part_name: string;
      brand: string;
      item_code: string;
      available: number;
    }[];
  }> {
    const whIds = warehouseId ? [warehouseId] : await this.getBranchWarehouseIds(branchId);
    if (whIds.length === 0) return { models: [], products: [], spare_parts: [] };

    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.model', 'm')
      .leftJoinAndSelect('m.brandRelation', 'b')
      .where('p.warehouse_id IN (:...whIds)', { whIds })
      .andWhere('p.product_status = :st', { st: ProductStatus.AVAILABLE })
      .andWhere("(p.transfer_status IS NULL OR p.transfer_status = 'NONE')")
      .getMany();

    const modelMap = new Map<
      string,
      {
        model_id: string;
        model_no: string;
        model_name: string;
        brand: string | null;
        available: number;
      }
    >();
    for (const p of products) {
      const m = p.model as Model | undefined;
      const entry = modelMap.get(p.model_id) ?? {
        model_id: p.model_id,
        model_no: m?.model_no ?? '',
        model_name: m?.model_name ?? 'Unknown model',
        brand: m?.brandRelation?.name ?? null,
        available: 0,
      };
      entry.available++;
      modelMap.set(p.model_id, entry);
    }

    // Spare-part stock lives on the spare_parts rows themselves (branch + warehouse scoped).
    const spareQb = this.sparePartRepo
      .createQueryBuilder('sp')
      .where('sp.branch_id = :branchId', { branchId });
    if (warehouseId) {
      // INTRA: parts in the chosen warehouse (legacy rows without a warehouse count too)
      spareQb.andWhere('(sp.warehouse_id = :warehouseId OR sp.warehouse_id IS NULL)', {
        warehouseId,
      });
    }
    const spareRows = await spareQb.getMany();

    const spare_parts = spareRows
      .map((sp) => ({
        spare_part_id: sp.id,
        part_name: sp.part_name,
        brand: sp.brand,
        item_code: sp.sku,
        available: sp.quantity - sp.reserved_quantity,
      }))
      .filter((sp) => sp.available > 0);

    return {
      models: [...modelMap.values()],
      products: products.map((p) => ({
        id: p.id,
        serial_no: p.serial_no,
        model_id: p.model_id,
        model_name: (p.model as Model | undefined)?.model_name ?? '',
      })),
      spare_parts,
    };
  }

  /** Free machines of a model at a branch — the giver's serial-assignment picklist. */
  async getAssignableProducts(
    branchId: string,
    modelId: string,
  ): Promise<{ id: string; serial_no: string; warehouse_id: string }[]> {
    const whIds = await this.getBranchWarehouseIds(branchId);
    if (whIds.length === 0) return [];
    const products = await this.availableProductsQb(modelId, whIds).getMany();
    return products.map((p) => ({
      id: p.id,
      serial_no: p.serial_no,
      warehouse_id: p.warehouse_id,
    }));
  }
}
