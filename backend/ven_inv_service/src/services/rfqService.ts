import { DataSource, EntityManager } from 'typeorm';
import { Rfq, RfqStatus } from '../entities/rfqEntity';
import { RfqItem, ItemType } from '../entities/rfqItemEntity';
import { RfqVendor, RfqVendorStatus } from '../entities/rfqVendorEntity';
import { RfqVendorItem } from '../entities/rfqVendorItemEntity';
import { Lot, LotStatus } from '../entities/lotEntity';
import { LotItem, LotItemType } from '../entities/lotItemEntity';
import { Purchase } from '../entities/purchaseEntity';
import { Model } from '../entities/modelEntity';
import { Product } from '../entities/productEntity';
import { SparePart } from '../entities/sparePartEntity';
import { Brand } from '../entities/brandEntity';
import { AppError } from '../errors/appError';
import * as xlsx from 'xlsx';
import * as ExcelJS from 'exceljs';

interface CreateRfqDto {
  branchId: string;
  createdBy: string;
  items: {
    itemType: ItemType;
    modelId?: string;
    productId?: string;
    brandId?: string;
    sparePartId?: string;
    customProductName?: string;
    customSparePartName?: string;
    customBrandName?: string;
    hsCode?: string;
    description?: string;
    quantity: number;
    expectedDeliveryDate?: Date;
  }[];
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

      for (const row of data) {
        const itemTypeRaw = (row.item || row.item_type || 'Product') as string;
        const itemType = itemTypeRaw.toString().toUpperCase().includes('SPARE')
          ? ItemType.SPARE_PART
          : ItemType.PRODUCT;

        const modelIdRaw = (row.model_name || row.model_id) as string;
        const itemName = (row.product_name || row.item_name || row.description) as string;
        const description = row.description as string;
        const quantity = parseInt(row.quantity as string);

        if (isNaN(quantity) || quantity <= 0)
          throw new AppError(`Invalid quantity for item: ${itemName || modelIdRaw}`, 400);

        let validatedModelId: string | undefined = undefined;
        let validatedProductId: string | undefined = undefined;
        let validatedSparePartId: string | undefined = undefined;
        let customProductName: string | undefined = undefined;
        let customSparePartName: string | undefined = undefined;
        const customBrandName: string | undefined = row.brand ? String(row.brand) : undefined;
        const hsCode: string | undefined = row.hs_code ? String(row.hs_code) : undefined;

        if (itemType === ItemType.PRODUCT) {
          if (!modelIdRaw && !itemName)
            throw new AppError('Missing model/item information in row', 400);

          if (modelIdRaw) {
            // Let's try to match modelIdRaw as a UUID first, or as a model_no
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              modelIdRaw,
            );
            let model: Model | null = null;
            if (isUuid) {
              model = await manager.findOne(Model, { where: { id: modelIdRaw } });
            } else {
              model = await manager.findOne(Model, { where: { model_no: modelIdRaw } });
            }
            if (!model) throw new AppError(`Model '${modelIdRaw}' not found in system`, 404);
            validatedModelId = model.id;
          }

          if (itemName) {
            // Try to find a product matching this name
            const product = await manager.findOne(Product, { where: { name: itemName } });
            if (product) {
              validatedProductId = product.id;
              if (!validatedModelId) validatedModelId = product.model_id;
            } else {
              customProductName = itemName;
            }
          }

          if (!validatedModelId)
            throw new AppError(
              'A valid Model must be specified or dynamically resolved for Product items',
              400,
            );
        } else if (itemType === ItemType.SPARE_PART) {
          if (!itemName && !modelIdRaw)
            throw new AppError('Missing spare part information in row', 400);
          const searchName = itemName || modelIdRaw;

          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            searchName,
          );
          let sparePart: SparePart | null = null;
          if (isUuid) {
            sparePart = await manager.findOne(SparePart, { where: { id: searchName } });
          } else {
            sparePart = await manager.findOne(SparePart, { where: { part_name: searchName } });
            if (!sparePart) {
              // Also try matching by item_code
              sparePart = await manager.findOne(SparePart, { where: { item_code: searchName } });
            }
          }

          if (sparePart) {
            validatedSparePartId = sparePart.id;
          } else {
            customSparePartName = searchName;
          }
        }

        let validatedBrandId: string | undefined = undefined;
        if (itemType === ItemType.SPARE_PART && customBrandName) {
          const brand = await manager.findOne(Brand, { where: { name: customBrandName } });
          if (brand) validatedBrandId = brand.id;
        }

        items.push(
          manager.create(RfqItem, {
            rfq_id: rfq.id,
            branch_id: branchId,
            created_by: createdBy,
            item_type: itemType,
            model_id: validatedModelId,
            product_id: validatedProductId,
            brand_id: validatedBrandId,
            spare_part_id: validatedSparePartId,
            custom_product_name: customProductName,
            custom_spare_part_name: customSparePartName,
            custom_brand_name: customBrandName,
            hs_code: hsCode,
            description: description !== itemName ? description : undefined,
            quantity,
          }),
        );
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
        const items = data.items.map((i) => {
          if (i.itemType === ItemType.PRODUCT) {
            if (!i.modelId) throw new AppError('Model ID is required for Product items', 400);
            if (!i.productId && !i.customProductName)
              throw new AppError('Either Product or Custom Product Name is required', 400);
          } else if (i.itemType === ItemType.SPARE_PART) {
            if (!i.brandId && !i.customBrandName)
              throw new AppError('Either Brand or Custom Brand Name is required', 400);
            if (!i.sparePartId && !i.customSparePartName)
              throw new AppError('Either Spare Part or Custom Spare Part Name is required', 400);
          }
          return manager.create(RfqItem, {
            rfq_id: rfq.id,
            branch_id: data.branchId,
            created_by: data.createdBy,
            item_type: i.itemType,
            model_id: i.modelId,
            product_id: i.productId,
            brand_id: i.brandId,
            spare_part_id: i.sparePartId,
            custom_product_name: i.customProductName,
            custom_spare_part_name: i.customSparePartName,
            custom_brand_name: i.customBrandName,
            hs_code: i.hsCode,
            description: i.description,
            quantity: i.quantity,
            expected_delivery_date: i.expectedDeliveryDate,
          });
        });
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

  private async generateRfqExcel(rfq: Rfq, manager?: EntityManager): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RFQ_Response');

    const repo = manager ? manager.getRepository(Rfq) : this.dataSource.getRepository(Rfq);
    const modelRepo = manager ? manager.getRepository(Model) : this.dataSource.getRepository(Model);
    const productRepo = manager
      ? manager.getRepository(Product)
      : this.dataSource.getRepository(Product);
    const brandRepo = manager ? manager.getRepository(Brand) : this.dataSource.getRepository(Brand);
    const sparePartRepo = manager
      ? manager.getRepository(SparePart)
      : this.dataSource.getRepository(SparePart);

    // Fetch full model details for items
    const rfqWithFullItems = await repo.findOne({
      where: { id: rfq.id },
      relations: ['items'],
    });

    if (!rfqWithFullItems) throw new AppError('RFQ items not found', 404);

    worksheet.columns = [
      { header: 'item', key: 'item', width: 15 },
      { header: 'model_name', key: 'model_name', width: 20 },
      { header: 'product_name', key: 'product_name', width: 25 },
      { header: 'hs_code', key: 'hs_code', width: 15 },
      { header: 'description', key: 'description', width: 30 },
      { header: 'quantity', key: 'quantity', width: 15 },
      { header: 'unit_price', key: 'unit_price', width: 15 },
      { header: 'total_price', key: 'total_price', width: 15 },
      { header: 'stock_status', key: 'stock_status', width: 25 },
      { header: 'available_quantity', key: 'available_quantity', width: 20 },
      { header: 'estimated_shipment_date', key: 'estimated_shipment_date', width: 25 },
      { header: 'vendor_note', key: 'vendor_note', width: 30 },
      { header: 'rfq_item_id', key: 'rfq_item_id', width: 25 },
    ];

    for (const item of rfqWithFullItems.items) {
      let modelId = '';
      let hsCode = '';
      let desc = '';
      let partName = '';

      if (item.item_type === ItemType.PRODUCT) {
        if (item.model_id) {
          const model = await modelRepo.findOne({ where: { id: item.model_id } });
          modelId = model?.model_name || model?.model_no || item.model_id;
          hsCode = model?.hs_code || '';
          desc = model?.description || '';
        }
        if (item.product_id) {
          const product = await productRepo.findOne({ where: { id: item.product_id } });
          partName = product?.name || '';
        } else if (item.custom_product_name) {
          partName = item.custom_product_name;
        }
        hsCode = item.hs_code || hsCode;
      } else {
        let brandNamePrefix = item.custom_brand_name ? `[${item.custom_brand_name}] ` : '';
        if (item.brand_id && !item.custom_brand_name) {
          const tempBrand = await brandRepo.findOne({ where: { id: item.brand_id } });
          if (tempBrand) brandNamePrefix = `[${tempBrand.name}] `;
        }

        if (item.spare_part_id) {
          const sp = await sparePartRepo.findOne({ where: { id: item.spare_part_id } });
          partName = `${brandNamePrefix}${sp?.part_name || ''}`;
          modelId = '';
        } else if (item.custom_spare_part_name) {
          partName = `${brandNamePrefix}${item.custom_spare_part_name}`;
          modelId = '';
        }
        hsCode = item.hs_code || '';
      }

      if (item.description) {
        desc = item.description;
      }

      worksheet.addRow({
        item: item.item_type === ItemType.PRODUCT ? 'Product' : 'Spare Part',
        model_name: modelId,
        product_name: partName,
        hs_code: hsCode,
        description: desc,
        quantity: item.quantity,
        unit_price: '',
        total_price: '',
        stock_status: '',
        available_quantity: '',
        estimated_shipment_date: '',
        vendor_note: '',
        rfq_item_id: item.id,
      });
    }

    const rowCount = worksheet.rowCount;
    // Add validations for stock_status (Column I) and estimated_shipment_date (Column K)
    for (let i = 2; i <= Math.max(rowCount, 100); i++) {
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"IN_STOCK,OUT_OF_STOCK,ON_PRODUCTION"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select a valid stock status from the dropdown list.',
      };

      worksheet.getCell(`K${i}`).dataValidation = {
        type: 'date',
        operator: 'greaterThanOrEqual',
        showErrorMessage: true,
        allowBlank: true,
        formulae: [new Date(new Date().setHours(0, 0, 0, 0))],
        errorStyle: 'error',
        errorTitle: 'Invalid Date',
        error: 'Please enter a valid present or future date.',
      };
      worksheet.getCell(`K${i}`).numFmt = 'yyyy-mm-dd';
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateExcelForDownload(rfqId: string): Promise<Buffer> {
    const rfq = await this.dataSource.getRepository(Rfq).findOne({
      where: { id: rfqId },
      relations: ['items', 'vendors'],
    });

    if (!rfq) throw new AppError('RFQ not found', 404);

    return this.generateRfqExcel(rfq);
  }

  async generateVendorQuoteExcel(rfqId: string, vendorId: string): Promise<Buffer> {
    const rfq = await this.dataSource.getRepository(Rfq).findOne({
      where: { id: rfqId },
      relations: ['items', 'vendors', 'vendors.vendor', 'vendors.items'],
    });

    if (!rfq) throw new AppError('RFQ not found', 404);

    const rfqVendor = rfq.vendors.find((v) => v.vendor_id === vendorId);
    if (!rfqVendor) throw new AppError('Vendor not found in this RFQ', 404);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Vendor_Quote_Review');

    worksheet.columns = [
      { header: 'item', key: 'item', width: 15 },
      { header: 'model_name', key: 'model_name', width: 20 },
      { header: 'product_name', key: 'product_name', width: 25 },
      { header: 'hs_code', key: 'hs_code', width: 15 },
      { header: 'description', key: 'description', width: 30 },
      { header: 'quantity', key: 'quantity', width: 15 },
      { header: 'unit_price', key: 'unit_price', width: 15 },
      { header: 'total_price', key: 'total_price', width: 15 },
      { header: 'stock_status', key: 'stock_status', width: 25 },
      { header: 'available_quantity', key: 'available_quantity', width: 20 },
      { header: 'estimated_shipment_date', key: 'estimated_shipment_date', width: 25 },
      { header: 'vendor_note', key: 'vendor_note', width: 30 },
      { header: 'rfq_item_id', key: 'rfq_item_id', width: 25 },
    ];

    for (const item of rfq.items) {
      let modelId = '';
      let hsCode = '';
      let desc = '';
      let partName = '';

      if (item.item_type === ItemType.PRODUCT) {
        if (item.model_id) {
          const model = await this.dataSource
            .getRepository(Model)
            .findOne({ where: { id: item.model_id } });
          modelId = model?.model_name || model?.model_no || item.model_id;
          hsCode = model?.hs_code || '';
          desc = model?.description || '';
        }
        if (item.product_id) {
          const product = await this.dataSource
            .getRepository(Product)
            .findOne({ where: { id: item.product_id } });
          partName = product?.name || '';
        } else if (item.custom_product_name) {
          partName = item.custom_product_name;
        }
        hsCode = item.hs_code || hsCode;
      } else {
        let brandNamePrefix = item.custom_brand_name ? `[${item.custom_brand_name}] ` : '';
        if (item.brand_id && !item.custom_brand_name) {
          const tempBrand = await this.dataSource
            .getRepository(Brand)
            .findOne({ where: { id: item.brand_id } });
          if (tempBrand) brandNamePrefix = `[${tempBrand.name}] `;
        }

        if (item.spare_part_id) {
          const sp = await this.dataSource
            .getRepository(SparePart)
            .findOne({ where: { id: item.spare_part_id } });
          partName = `${brandNamePrefix}${sp?.part_name || ''}`;
          modelId = '';
        } else if (item.custom_spare_part_name) {
          partName = `${brandNamePrefix}${item.custom_spare_part_name}`;
          modelId = '';
        }
        hsCode = item.hs_code || '';
      }

      if (item.description) {
        desc = item.description;
      }

      const vendorItem = rfqVendor.items?.find((vi) => vi.rfq_item_id === item.id);

      worksheet.addRow({
        item: item.item_type === ItemType.PRODUCT ? 'Product' : 'Spare Part',
        model_name: modelId,
        product_name: partName,
        hs_code: hsCode,
        description: desc,
        quantity: item.quantity,
        unit_price: vendorItem?.unit_price || '',
        total_price: vendorItem?.total_price || '',
        stock_status: vendorItem?.stock_status || '',
        available_quantity: vendorItem?.available_quantity || '',
        estimated_shipment_date: vendorItem?.estimated_shipment_date
          ? new Date(vendorItem.estimated_shipment_date)
          : '',
        vendor_note: vendorItem?.vendor_note || '',
        rfq_item_id: item.id,
      });
    }

    const rowCount = worksheet.rowCount;
    // Add validations for stock_status (Column I) and estimated_shipment_date (Column K)
    for (let i = 2; i <= Math.max(rowCount, 100); i++) {
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"IN_STOCK,OUT_OF_STOCK,ON_PRODUCTION"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select a valid stock status from the dropdown list.',
      };

      worksheet.getCell(`K${i}`).dataValidation = {
        type: 'date',
        operator: 'greaterThanOrEqual',
        showErrorMessage: true,
        allowBlank: true,
        formulae: [new Date(new Date().setHours(0, 0, 0, 0))],
        errorStyle: 'error',
        errorTitle: 'Invalid Date',
        error: 'Please enter a valid present or future date.',
      };
      worksheet.getCell(`K${i}`).numFmt = 'yyyy-mm-dd';
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
      const excelBuffer = await this.generateRfqExcel(rfq, manager);

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
      if (
        ![RfqStatus.SENT, RfqStatus.PARTIAL_QUOTED, RfqStatus.FULLY_QUOTED].includes(rfq.status)
      ) {
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

        // Recalculate total price on backend using the quantity vendor actually quoted
        // If availableQuantity is not provided, we fallback to requested quantity
        const actualQty =
          quote.availableQuantity !== undefined && quote.availableQuantity !== null
            ? quote.availableQuantity
            : item.quantity;

        const totalPrice = Number(quote.unitPrice) * Number(actualQty);
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

      rfqVendor.items = vendorItemsToSave;
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

    const validQuotes = rfq.vendors.filter((v) => {
      if (!v.status) return false;
      const s = v.status.toString().toUpperCase().trim();
      return s === 'QUOTED' || s === 'AWARDED';
    });

    const itemComparisons = rfq.items.map((item) => {
      const vendorPrices = validQuotes
        .map((vq) => {
          const vi = vq.items?.find((i) => i.rfq_item_id === item.id);
          return {
            vendorId: vq.vendor_id,
            vendorName: vq.vendor?.name,
            unitPrice: vi ? Number(vi.unit_price) : null,
            totalPrice: vi ? Number(vi.total_price) : null,
            estimatedShipmentDate: vi ? vi.estimated_shipment_date : null,
          };
        })
        .filter((vp) => vp.unitPrice !== null);

      const lowestPrice =
        vendorPrices.length > 0
          ? Math.min(...vendorPrices.map((vp) => vp.unitPrice as number))
          : null;

      return {
        rfqItemId: item.id,
        modelId: item.model_id,
        productId: item.product_id,
        brandId: item.brand_id,
        sparePartId: item.spare_part_id,
        customProductName: item.custom_product_name,
        customSparePartName: item.custom_spare_part_name,
        description: item.description,
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

      const allVendors = await manager.find(RfqVendor, {
        where: { rfq_id: rfqId },
        relations: ['vendor'], // Need vendor details for emails
      });
      const targetVendor = allVendors.find((v) => v.vendor_id === vendorId);

      if (!targetVendor) throw new AppError('Vendor not found in this RFQ', 404);
      if (targetVendor.status !== RfqVendorStatus.QUOTED) {
        throw new AppError('Vendor has not provided a valid quote', 400);
      }

      const { publishEmailJob } = await import('../queues/emailPublisher');

      for (const vendor of allVendors) {
        if (vendor.id === targetVendor.id) {
          vendor.status = RfqVendorStatus.AWARDED;

          if (vendor.vendor?.email) {
            await publishEmailJob({
              type: 'RFQ_AWARDED',
              email: vendor.vendor.email,
              vendorName: vendor.vendor.name,
              rfqNumber: rfq.rfq_number,
            });
          }
        } else {
          vendor.status = RfqVendorStatus.REJECTED;

          if (vendor.vendor?.email) {
            await publishEmailJob({
              type: 'RFQ_REJECTED',
              email: vendor.vendor.email,
              vendorName: vendor.vendor.name,
              rfqNumber: rfq.rfq_number,
            });
          }
        }
        await manager.save(vendor);
      }

      rfq.status = RfqStatus.AWARDED;
      rfq.awarded_vendor_id = targetVendor.vendor_id;
      await manager.save(rfq);

      return { success: true, message: 'Vendor awarded successfully', rfq };
    });
  }

  async createLotFromRfq(rfqId: string, userId: string, warehouseId?: string): Promise<Lot> {
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
        warehouse_id: warehouseId,
        createdBy: userId,
        notes: `Auto-generated from RFQ ${rfq.rfq_number}`,
      });

      await manager.save(lot);

      const lotItemsToSave: LotItem[] = [];

      for (const quotedItem of awardedVendor.items) {
        if (!quotedItem.rfq_item) throw new AppError('RFQ item reference missing in quote', 500);

        const itemType =
          quotedItem.rfq_item.item_type === ItemType.PRODUCT
            ? LotItemType.MODEL
            : LotItemType.SPARE_PART;

        const modelId =
          itemType === LotItemType.MODEL ? quotedItem.rfq_item.model_id || undefined : undefined;
        const sparePartId =
          itemType === LotItemType.SPARE_PART
            ? quotedItem.rfq_item.spare_part_id || undefined
            : undefined;
        const customProductName =
          itemType === LotItemType.MODEL
            ? quotedItem.rfq_item.custom_product_name || undefined
            : undefined;
        const customSparePartName =
          itemType === LotItemType.SPARE_PART
            ? quotedItem.rfq_item.custom_spare_part_name || undefined
            : undefined;

        // Final safety check before save to avoid constraint violation
        if (!modelId && !customProductName && !sparePartId && !customSparePartName) {
          throw new AppError(
            `Item ${quotedItem.rfq_item.id} has no valid identification (Model ID or Custom Name)`,
            400,
          );
        }

        const lotItem = manager.create(LotItem, {
          lotId: lot.id,
          itemType: itemType,
          modelId,
          sparePartId,
          customProductName,
          customSparePartName,
          expectedQuantity: quotedItem.available_quantity ?? quotedItem.rfq_item.quantity,
          unitPrice: quotedItem.unit_price,
          totalPrice: quotedItem.total_price,
        });

        lotItemsToSave.push(lotItem);
      }

      await manager.save(lotItemsToSave);

      // Create Purchase record for financial tracking
      const purchase = manager.create(Purchase, {
        lotId: lot.id,
        vendorId: lot.vendorId,
        branchId: lot.branch_id || '',
        purchaseAmount: lot.totalAmount,
        documentationFee: 0,
        labourCost: 0,
        handlingFee: 0,
        transportationCost: 0,
        shippingCost: 0,
        groundfieldCost: 0,
        totalAmount: lot.totalAmount,
        createdBy: userId,
      });
      await manager.save(purchase);

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
      .leftJoinAndSelect('rfq.items', 'items')
      .leftJoinAndSelect('rfq.vendors', 'vendors')
      .leftJoinAndSelect('vendors.vendor', 'vendor');

    if (branchId) {
      query.where('rfq.branch_id = :branchId', { branchId });
    }

    return query.orderBy('rfq.created_at', 'DESC').getMany();
  }
}
