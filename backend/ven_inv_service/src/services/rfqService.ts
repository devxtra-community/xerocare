import { DataSource } from 'typeorm';
import { Rfq, RfqStatus } from '../entities/rfqEntity';
import { RfqItem, ItemType } from '../entities/rfqItemEntity';
import { RfqVendor, RfqVendorStatus } from '../entities/rfqVendorEntity';
import { RfqVendorItem } from '../entities/rfqVendorItemEntity';
import { Lot, LotStatus } from '../entities/lotEntity';
import { LotItem, LotItemType } from '../entities/lotItemEntity';
import { Model } from '../entities/modelEntity';
import { AppError } from '../errors/appError';
import * as xlsx from 'xlsx';

interface CreateRfqDto {
  branchId: string;
  createdBy: string;
  items: { itemType: ItemType; itemId: string; quantity: number; expectedDeliveryDate?: Date }[];
  vendorIds: string[];
}

interface QuoteItemDto {
  rfqItemId: string;
  unitPrice: number;
  stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_PRODUCTION';
  availableQuantity: number;
  estimatedShipmentDate?: Date;
  vendorNote?: string;
}

export class RfqService {
  constructor(private readonly dataSource: DataSource) {}

  private generateRfqNumber(): string {
    const date = new Date();
    const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    return `RFQ-${yyyymm}-${random}`;
  }

  async uploadRfqItems(
    buffer: Buffer,
    branchId: string,
    createdBy: string,
    vendorIds: string[],
  ): Promise<Rfq> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as Record<
      string,
      unknown
    >[];

    if (data.length === 0) throw new AppError('Excel file is empty', 400);

    return this.dataSource.transaction(async (manager) => {
      const rfq = manager.create(Rfq, {
        rfq_number: this.generateRfqNumber(),
        branch_id: branchId,
        created_by: createdBy,
        status: RfqStatus.DRAFT,
      });
      await manager.save(rfq);

      const items: RfqItem[] = [];
      const seenModelIds = new Set<string>();

      for (const row of data) {
        const modelId = row.model_id as string;
        const quantity = parseInt(row.quantity as string);

        if (!modelId) throw new AppError('Missing model_id in row', 400);
        if (isNaN(quantity) || quantity <= 0)
          throw new AppError(`Invalid quantity for model ${modelId}`, 400);
        if (seenModelIds.has(modelId)) throw new AppError(`Duplicate model_id: ${modelId}`, 400);

        const modelExists = await manager.findOne(Model, { where: { id: modelId } });
        if (!modelExists) throw new AppError(`Model with ID ${modelId} not found`, 404);

        items.push(
          manager.create(RfqItem, {
            rfq_id: rfq.id,
            item_type: ItemType.MODEL,
            item_id: modelId,
            quantity,
          }),
        );
        seenModelIds.add(modelId);
      }

      await manager.save(items);

      if (vendorIds?.length > 0) {
        const vendors = vendorIds.map((vId) =>
          manager.create(RfqVendor, {
            rfq_id: rfq.id,
            vendor_id: vId,
            status: RfqVendorStatus.INVITED,
          }),
        );
        await manager.save(vendors);
      }

      return manager.findOne(Rfq, {
        where: { id: rfq.id },
        relations: ['items', 'vendors'],
      }) as Promise<Rfq>;
    });
  }

  async createRfq(data: CreateRfqDto): Promise<Rfq> {
    return this.dataSource.transaction(async (manager) => {
      const rfq = manager.create(Rfq, {
        rfq_number: this.generateRfqNumber(),
        branch_id: data.branchId,
        created_by: data.createdBy,
        status: RfqStatus.DRAFT,
      });

      await manager.save(rfq);

      if (data.items?.length > 0) {
        const items = data.items.map((i) =>
          manager.create(RfqItem, {
            rfq_id: rfq.id,
            item_type: i.itemType,
            item_id: i.itemId,
            quantity: i.quantity,
            expected_delivery_date: i.expectedDeliveryDate,
          }),
        );
        await manager.save(items);
      }

      if (data.vendorIds?.length > 0) {
        const vendors = data.vendorIds.map((vId) =>
          manager.create(RfqVendor, {
            rfq_id: rfq.id,
            vendor_id: vId,
            status: RfqVendorStatus.INVITED,
          }),
        );
        await manager.save(vendors);
      }

      return manager.findOne(Rfq, {
        where: { id: rfq.id },
        relations: ['items', 'vendors'],
      }) as Promise<Rfq>;
    });
  }

  private async generateRfqExcel(rfq: Rfq): Promise<Buffer> {
    const rows: Record<string, unknown>[] = [];

    // Fetch full model details for items
    const rfqWithFullItems = await this.dataSource.getRepository(Rfq).findOne({
      where: { id: rfq.id },
      relations: ['items'],
    });

    if (!rfqWithFullItems) throw new AppError('RFQ items not found', 404);

    for (const item of rfqWithFullItems.items) {
      const model = await this.dataSource
        .getRepository(Model)
        .findOne({ where: { id: item.item_id } });

      rows.push({
        rfq_item_id: item.id, // HIDDEN but required for strict 2-way match
        model_id: item.item_id,
        hs_code: model?.hs_code || '',
        description: model?.description || '',
        quantity: item.quantity,
        unit_price: '',
        total_price: '',
        stock_status: '[IN_STOCK / OUT_OF_STOCK / ON_PRODUCTION]',
        available_quantity: '',
        estimated_shipment_date: 'YYYY-MM-DD',
        vendor_note: '',
      });
    }

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);

    // Hide the first column (rfq_item_id) if we want to be clean,
    // but the user said "model_id... will be filled by user"
    // Actually, if we use rfq_item_id, matching is trivial.

    xlsx.utils.book_append_sheet(wb, ws, 'RFQ_Response');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async sendRfq(rfqId: string): Promise<Rfq> {
    const { publishEmailJob } = await import('../queues/emailPublisher');

    return this.dataSource.transaction(async (manager) => {
      const rfq = await manager.findOne(Rfq, {
        where: { id: rfqId },
        relations: ['items', 'vendors', 'vendors.vendor'],
      });

      if (!rfq) throw new AppError('RFQ not found', 404);
      if (rfq.status !== RfqStatus.DRAFT) throw new AppError('Only DRAFT RFQs can be sent', 400);
      if (rfq.items.length === 0) throw new AppError('Cannot send RFQ without items', 400);
      if (rfq.vendors.length === 0) throw new AppError('Cannot send RFQ without vendors', 400);

      rfq.status = RfqStatus.SENT;
      const excelBuffer = await this.generateRfqExcel(rfq);

      for (const rfqVendor of rfq.vendors) {
        rfqVendor.status = RfqVendorStatus.INVITED;
        await manager.save(rfqVendor);

        // Publish email job for each vendor
        await publishEmailJob({
          type: 'RFQ_SENT',
          email: rfqVendor.vendor.email,
          vendorName: rfqVendor.vendor.name,
          rfqNumber: rfq.rfq_number,
          excelBuffer: excelBuffer,
        });
      }

      await manager.save(rfq);
      return rfq;
    });
  }

  async enterQuote(rfqId: string, vendorId: string, quotes: QuoteItemDto[]): Promise<RfqVendor> {
    return this.dataSource.transaction(async (manager) => {
      const rfq = await manager.findOne(Rfq, {
        where: { id: rfqId },
        relations: ['items', 'vendors'],
      });

      if (!rfq) throw new AppError('RFQ not found', 404);
      if (![RfqStatus.SENT, RfqStatus.PARTIAL_QUOTED].includes(rfq.status)) {
        throw new AppError('RFQ is not receiving quotes', 400);
      }

      const rfqVendor = await manager.findOne(RfqVendor, {
        where: { rfq_id: rfqId, vendor_id: vendorId },
        relations: ['items'],
      });

      if (!rfqVendor) throw new AppError('Vendor not invited to this RFQ', 404);

      // Validation rules: must match exact items
      if (quotes.length !== rfq.items.length) {
        throw new AppError(`Quote must include exactly ${rfq.items.length} items`, 400);
      }

      let totalQuotedAmount = 0;

      // Delete old quote items if re-quoting
      if (rfqVendor.items?.length > 0) {
        await manager.delete(RfqVendorItem, { rfq_vendor_id: rfqVendor.id });
      }

      const vendorItemsToSave: RfqVendorItem[] = [];

      for (const item of rfq.items) {
        const quote = quotes.find((q) => q.rfqItemId === item.id);
        if (!quote) throw new AppError(`Missing quote for item ${item.id}`, 400);
        if (quote.unitPrice < 0) throw new AppError('Unit price cannot be negative', 400);

        // Recalculate total price on backend
        const totalPrice = Number(quote.unitPrice) * Number(item.quantity);
        totalQuotedAmount += totalPrice;

        const vendorItem = manager.create(RfqVendorItem, {
          rfq_vendor_id: rfqVendor.id,
          rfq_item_id: item.id,
          unit_price: quote.unitPrice,
          total_price: totalPrice,
          stock_status: quote.stockStatus,
          available_quantity: quote.availableQuantity,
          estimated_shipment_date: quote.estimatedShipmentDate,
          vendor_note: quote.vendorNote,
        });
        vendorItemsToSave.push(vendorItem);
      }

      await manager.save(vendorItemsToSave);

      rfqVendor.status = RfqVendorStatus.QUOTED;
      rfqVendor.total_quoted_amount = totalQuotedAmount;
      rfqVendor.quoted_at = new Date();
      await manager.save(rfqVendor);

      // Check if all vendors quoted
      const updatedVendors = await manager.find(RfqVendor, { where: { rfq_id: rfqId } });
      const allQuoted = updatedVendors.every((v) => ['QUOTED', 'REJECTED'].includes(v.status));

      const newStatus = allQuoted ? RfqStatus.FULLY_QUOTED : RfqStatus.PARTIAL_QUOTED;
      await manager.update(Rfq, { id: rfq.id }, { status: newStatus });

      return rfqVendor;
    });
  }

  async getComparison(rfqId: string) {
    const rfq = await this.dataSource.getRepository(Rfq).findOne({
      where: { id: rfqId },
      relations: ['items', 'vendors', 'vendors.vendor', 'vendors.items'],
    });

    if (!rfq) throw new AppError('RFQ not found', 404);

    const validQuotes = rfq.vendors.filter((v) => v.status === RfqVendorStatus.QUOTED);

    const itemComparisons = rfq.items.map((item) => {
      const vendorPrices = validQuotes
        .map((vq) => {
          const vi = vq.items?.find((i) => i.rfq_item_id === item.id);
          return {
            vendorId: vq.vendor_id,
            vendorName: vq.vendor?.name,
            unitPrice: vi ? Number(vi.unit_price) : null,
            totalPrice: vi ? Number(vi.total_price) : null,
          };
        })
        .filter((vp) => vp.unitPrice !== null);

      const lowestPrice =
        vendorPrices.length > 0
          ? Math.min(...vendorPrices.map((vp) => vp.unitPrice as number))
          : null;

      return {
        rfqItemId: item.id,
        itemId: item.item_id,
        itemType: item.item_type,
        quantity: item.quantity,
        lowestPrice,
        vendorPrices: vendorPrices.map((vp) => ({
          ...vp,
          isLowest: lowestPrice !== null && vp.unitPrice === lowestPrice,
          percentDiff:
            lowestPrice && vp.unitPrice ? ((vp.unitPrice - lowestPrice) / lowestPrice) * 100 : 0,
        })),
      };
    });

    const cheapestVendor =
      validQuotes.length > 0
        ? validQuotes.reduce((prev, curr) =>
            Number(curr.total_quoted_amount) < Number(prev.total_quoted_amount) ? curr : prev,
          )
        : null;

    return {
      rfqId: rfq.id,
      status: rfq.status,
      items: itemComparisons,
      vendorsSummary: validQuotes.map((vq) => ({
        vendorId: vq.vendor_id,
        vendorName: vq.vendor?.name,
        totalAmount: Number(vq.total_quoted_amount),
        isCheapest: cheapestVendor ? vq.id === cheapestVendor.id : false,
      })),
    };
  }

  async awardVendor(rfqId: string, vendorId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Use pessimistic Write lock if supported, to strictly prevent concurrent award races
      const rfq = await manager.findOne(Rfq, {
        where: { id: rfqId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!rfq) throw new AppError('RFQ not found', 404);
      if (![RfqStatus.PARTIAL_QUOTED, RfqStatus.FULLY_QUOTED].includes(rfq.status)) {
        throw new AppError('RFQ must be fully or partially quoted before award', 400);
      }

      const allVendors = await manager.find(RfqVendor, { where: { rfq_id: rfqId } });
      const targetVendor = allVendors.find((v) => v.vendor_id === vendorId);

      if (!targetVendor) throw new AppError('Vendor not found in this RFQ', 404);
      if (targetVendor.status !== RfqVendorStatus.QUOTED) {
        throw new AppError('Vendor has not provided a valid quote', 400);
      }

      for (const vendor of allVendors) {
        if (vendor.id === targetVendor.id) {
          vendor.status = RfqVendorStatus.AWARDED;
        } else {
          vendor.status = RfqVendorStatus.REJECTED;
        }
        await manager.save(vendor);
      }

      rfq.status = RfqStatus.AWARDED;
      rfq.awarded_vendor_id = targetVendor.vendor_id;
      await manager.save(rfq);

      return { success: true, message: 'Vendor awarded successfully', rfq };
    });
  }

  async createLotFromRfq(rfqId: string, userId: string): Promise<Lot> {
    return this.dataSource.transaction(async (manager) => {
      const rfq = await manager.findOne(Rfq, {
        where: { id: rfqId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!rfq) throw new AppError('RFQ not found', 404);
      if (rfq.status !== RfqStatus.AWARDED) {
        throw new AppError('RFQ must be awarded before creating lot', 400);
      }

      const awardedVendor = await manager.findOne(RfqVendor, {
        where: { rfq_id: rfqId, status: RfqVendorStatus.AWARDED },
        relations: ['items', 'items.rfq_item'],
      });

      if (!awardedVendor) throw new AppError('Awarded vendor data not found', 500);

      const date = new Date();
      const lotNumber = `LOT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const lot = manager.create(Lot, {
        lotNumber,
        vendorId: awardedVendor.vendor_id,
        purchaseDate: new Date(),
        totalAmount: awardedVendor.total_quoted_amount,
        status: LotStatus.PENDING,
        branch_id: rfq.branch_id,
        createdBy: userId,
        notes: `Auto-generated from RFQ ${rfq.rfq_number}`,
      });

      await manager.save(lot);

      const lotItemsToSave: LotItem[] = [];

      for (const quotedItem of awardedVendor.items) {
        const itemType =
          quotedItem.rfq_item.item_type === ItemType.MODEL
            ? LotItemType.MODEL
            : LotItemType.SPARE_PART;
        const itemId = quotedItem.rfq_item.item_id;

        const lotItem = manager.create(LotItem, {
          lotId: lot.id,
          itemType: itemType,
          modelId: itemType === LotItemType.MODEL ? itemId : undefined,
          sparePartId: itemType === LotItemType.SPARE_PART ? itemId : undefined,
          quantity: quotedItem.rfq_item.quantity,
          unitPrice: quotedItem.unit_price,
          totalPrice: quotedItem.total_price,
        });

        lotItemsToSave.push(lotItem);
      }

      await manager.save(lotItemsToSave);

      rfq.status = RfqStatus.CLOSED;
      await manager.save(rfq);

      return lot;
    });
  }

  // Helper method for getting a single RFQ with relations
  async getRfqById(id: string) {
    return this.dataSource.getRepository(Rfq).findOne({
      where: { id },
      relations: ['items', 'vendors', 'vendors.vendor', 'vendors.items', 'branch', 'creator'],
    });
  }

  // Fetch all RFQs
  async getAllRfqs(branchId?: string) {
    const query = this.dataSource
      .getRepository(Rfq)
      .createQueryBuilder('rfq')
      .leftJoinAndSelect('rfq.creator', 'creator')
      .leftJoinAndSelect('rfq.vendors', 'vendors')
      .leftJoinAndSelect('vendors.vendor', 'vendor');

    if (branchId) {
      query.where('rfq.branch_id = :branchId', { branchId });
    }

    return query.orderBy('rfq.created_at', 'DESC').getMany();
  }
}
