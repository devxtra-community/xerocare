import { DataSource, EntityManager, In } from 'typeorm';
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
import { logger } from '../config/logger';
import { Vendor } from '../entities/vendorEntity';
import { Branch } from '../entities/branchEntity';
import { Warehouse } from '../entities/warehouseEntity';
import { classifyPurchaseOrigin } from '../entities/enums/purchaseOrigin';
import { getExchangeRate, round2 } from '../utils/exchangeRate';

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
    mpn?: string;
    compatibleModels?: string;
    modelIds?: string[];
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
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as Record<
      string,
      unknown
    >[];

    if (data.length === 0) {
      logger.warn('Excel RFQ upload failed: File is empty', { branchId, createdBy });
      throw new AppError('Excel file is empty', 400);
    }

    logger.info('Starting RFQ upload from Excel', { rowCount: data.length, branchId });

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
        const mpn: string | undefined = row.mpn ? String(row.mpn) : undefined;
        const compatibleModels: string | undefined =
          row.compatible_models || row.compatible_model
            ? String(row.compatible_models || row.compatible_model)
            : undefined;

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
              // Also try matching by SKU
              sparePart = await manager.findOne(SparePart, { where: { sku: searchName } });
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
            mpn: mpn,
            compatible_models: compatibleModels,
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
            mpn: i.mpn,
            compatible_models: i.compatibleModels,
            modelIds: i.modelIds,
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

  /**
   * Replaces a DRAFT RFQ's items and vendor invite list wholesale — same
   * validation as createRfq. Only DRAFT RFQs are editable: once sent, vendors
   * may already be quoting against the current item set.
   */
  async updateRfq(id: string, data: Omit<CreateRfqDto, 'branchId' | 'createdBy'>): Promise<Rfq> {
    return this.dataSource.transaction(async (manager) => {
      const rfq = await manager.findOne(Rfq, { where: { id } });
      if (!rfq) throw new AppError('RFQ not found', 404);
      if (rfq.status !== RfqStatus.DRAFT) {
        throw new AppError('Only draft RFQs can be edited', 400);
      }

      await manager.delete(RfqItem, { rfq_id: id });
      await manager.delete(RfqVendor, { rfq_id: id });

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
            rfq_id: id,
            branch_id: rfq.branch_id,
            created_by: rfq.created_by,
            item_type: i.itemType,
            model_id: i.modelId,
            product_id: i.productId,
            brand_id: i.brandId,
            spare_part_id: i.sparePartId,
            custom_product_name: i.customProductName,
            custom_spare_part_name: i.customSparePartName,
            custom_brand_name: i.customBrandName,
            hs_code: i.hsCode,
            mpn: i.mpn,
            compatible_models: i.compatibleModels,
            modelIds: i.modelIds,
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
            rfq_id: id,
            vendor_id: vId,
            status: RfqVendorStatus.INVITED,
          }),
        );
        await manager.save(vendors);
      }

      return manager.findOne(Rfq, {
        where: { id },
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
      { header: 'HS Code', key: 'hs_code', width: 15 },
      { header: 'Manufacturing Part Number', key: 'mpn', width: 20 },
      { header: 'Compatible Models', key: 'compatible_models', width: 25 },
      { header: 'description', key: 'description', width: 30 },
      { header: 'quantity', key: 'quantity', width: 15 },
      { header: 'stock_status', key: 'stock_status', width: 25 },
      { header: 'available_quantity', key: 'available_quantity', width: 20 },
      { header: 'unit_price', key: 'unit_price', width: 15 },
      { header: 'total_price', key: 'total_price', width: 15 },
      { header: 'estimated_shipment_date', key: 'estimated_shipment_date', width: 25 },
      { header: 'vendor_note', key: 'vendor_note', width: 30 },
      { header: 'rfq_item_id', key: 'rfq_item_id', width: 25 },
    ];

    for (const item of rfqWithFullItems.items) {
      let modelId = '';
      let hsCode = '';
      let mpn = '';
      let compatibleModels = '';
      let desc = '';
      let partName = '';

      if (item.item_type === ItemType.PRODUCT) {
        if (item.model_id) {
          const model = await modelRepo.findOne({ where: { id: item.model_id } });
          modelId = model?.model_name || model?.model_no || item.model_id;
          desc = model?.description || '';
        }
        if (item.product_id) {
          const product = await productRepo.findOne({ where: { id: item.product_id } });
          partName = product?.name || '';
          hsCode = product?.hs_code || '';
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
        mpn = item.mpn || '';
        compatibleModels = item.compatible_models || '';

        if (item.modelIds && item.modelIds.length > 0) {
          if (item.modelIds.includes('universal')) {
            compatibleModels = 'Universal';
          } else {
            const models_records = await modelRepo.find({
              where: { id: In(item.modelIds) },
            });
            compatibleModels = models_records.map((m) => m.model_name || m.model_no).join(', ');
          }
        }
      }

      if (item.description) {
        desc = item.description;
      }

      worksheet.addRow({
        item: item.item_type === ItemType.PRODUCT ? 'Product' : 'Spare Part',
        model_name: modelId,
        product_name: partName,
        hs_code: hsCode,
        mpn: mpn,
        compatible_models: compatibleModels,
        description: desc,
        quantity: item.quantity,
        stock_status: undefined,
        available_quantity: undefined,
        unit_price: undefined,
        total_price: undefined,
        estimated_shipment_date: undefined,
        vendor_note: undefined,
        rfq_item_id: item.id,
      });
    }

    const rowCount = worksheet.rowCount;
    // Add validations for stock_status (Column I) and estimated_shipment_date (Column M)
    for (let i = 2; i <= Math.max(rowCount, 100); i++) {
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"IN_STOCK,OUT_OF_STOCK,ON_PRODUCTION"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select a valid stock status from the dropdown list.',
      };

      worksheet.getCell(`M${i}`).dataValidation = {
        type: 'date',
        operator: 'greaterThanOrEqual',
        showErrorMessage: true,
        allowBlank: true,
        formulae: [new Date(new Date().setHours(0, 0, 0, 0))],
        errorStyle: 'error',
        errorTitle: 'Invalid Date',
        error: 'Please enter a valid present or future date (YYYY-MM-DD).',
      };
      worksheet.getCell(`M${i}`).numFmt = 'yyyy-mm-dd';
      worksheet.getCell(`M${i}`).font = { color: { argb: 'FF0000FF' }, underline: true }; // Visual hint for interactable cell
    }

    // total_price (L) autofills from unit_price (K) × available_quantity (J).
    for (let i = 2; i <= rowCount; i++) {
      worksheet.getCell(`L${i}`).value = {
        formula: `IF(OR($K${i}="",$J${i}=""),"",$K${i}*$J${i})`,
      };
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
      { header: 'HS Code', key: 'hs_code', width: 15 },
      { header: 'Manufacturing Part Number', key: 'mpn', width: 20 },
      { header: 'Compatible Models', key: 'compatible_models', width: 25 },
      { header: 'description', key: 'description', width: 30 },
      { header: 'quantity', key: 'quantity', width: 15 },
      { header: 'stock_status', key: 'stock_status', width: 25 },
      { header: 'available_quantity', key: 'available_quantity', width: 20 },
      { header: 'unit_price', key: 'unit_price', width: 15 },
      { header: 'total_price', key: 'total_price', width: 15 },
      { header: 'estimated_shipment_date', key: 'estimated_shipment_date', width: 25 },
      { header: 'vendor_note', key: 'vendor_note', width: 30 },
      { header: 'rfq_item_id', key: 'rfq_item_id', width: 25 },
    ];

    for (const item of rfq.items) {
      let modelId = '';
      let hsCode = '';
      let mpn = '';
      let compatibleModels = '';
      let desc = '';
      let partName = '';

      if (item.item_type === ItemType.PRODUCT) {
        if (item.model_id) {
          const model = await this.dataSource
            .getRepository(Model)
            .findOne({ where: { id: item.model_id } });
          modelId = model?.model_name || model?.model_no || item.model_id;
          desc = model?.description || '';
        }
        if (item.product_id) {
          const product = await this.dataSource
            .getRepository(Product)
            .findOne({ where: { id: item.product_id } });
          partName = product?.name || '';
          hsCode = product?.hs_code || '';
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
        mpn = item.mpn || '';
        compatibleModels = item.compatible_models || '';

        if (item.modelIds && item.modelIds.length > 0) {
          if (item.modelIds.includes('universal')) {
            compatibleModels = 'Universal';
          } else {
            const models_records = await this.dataSource.getRepository(Model).find({
              where: { id: In(item.modelIds) },
            });
            compatibleModels = models_records.map((m) => m.model_name || m.model_no).join(', ');
          }
        }
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
        mpn: mpn,
        compatible_models: compatibleModels,
        description: desc,
        quantity: item.quantity,
        unit_price: vendorItem?.unit_price ?? undefined,
        total_price: vendorItem?.total_price ?? undefined,
        stock_status: vendorItem?.stock_status ?? undefined,
        available_quantity: vendorItem?.available_quantity ?? undefined,
        estimated_shipment_date: vendorItem?.estimated_shipment_date
          ? new Date(vendorItem.estimated_shipment_date)
          : undefined,
        vendor_note: vendorItem?.vendor_note ?? undefined,
        rfq_item_id: item.id,
      });
    }

    const rowCount = worksheet.rowCount;
    // Add validations for stock_status (Column I) and estimated_shipment_date (Column M)
    for (let i = 2; i <= Math.max(rowCount, 100); i++) {
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"IN_STOCK,OUT_OF_STOCK,ON_PRODUCTION"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select a valid stock status from the dropdown list.',
      };

      worksheet.getCell(`M${i}`).dataValidation = {
        type: 'date',
        operator: 'greaterThanOrEqual',
        showErrorMessage: true,
        allowBlank: true,
        formulae: [new Date(new Date().setHours(0, 0, 0, 0))],
        errorStyle: 'error',
        errorTitle: 'Invalid Date',
        error: 'Please enter a valid present or future date (YYYY-MM-DD).',
      };
      worksheet.getCell(`M${i}`).numFmt = 'yyyy-mm-dd';
      worksheet.getCell(`M${i}`).font = { color: { argb: 'FF0000FF' }, underline: true }; // Visual hint for interactable cell
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
      logger.info('RFQ sent successfully to vendors', {
        rfqId: rfq.id,
        rfqNumber: rfq.rfq_number,
        vendorCount: rfq.vendors.length,
      });
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

      const vendor = await manager.findOne(Vendor, { where: { id: vendorId } });
      if (!vendor) throw new AppError('Vendor not found', 404);
      rfqVendor.vendor_currency_code = vendor.currency || 'QAR';

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

      // Convert the quote into the purchasing branch's currency so quotes in
      // different vendor currencies can be compared. Best effort here — the
      // authoritative rate is re-fetched and snapshotted at award time.
      try {
        const branch = await manager.findOne(Branch, { where: { id: rfq.branch_id } });
        const branchCurrency = branch?.currency_code || 'QAR';
        const vendorCurrency = rfqVendor.vendor_currency_code || 'QAR';
        const { rate, fetchedAt } = await getExchangeRate(manager, vendorCurrency, branchCurrency);
        rfqVendor.vendor_amount = totalQuotedAmount;
        rfqVendor.branch_currency_code = branchCurrency;
        rfqVendor.branch_converted_amount = round2(totalQuotedAmount * rate);
        rfqVendor.exchange_rate_snapshot = rate;
        rfqVendor.exchange_rate_fetched_at = fetchedAt;
      } catch (err) {
        logger.warn('Quote currency conversion failed — quote saved unconverted', {
          rfqId,
          vendorId,
          error: err instanceof Error ? err.message : err,
        });
      }

      await manager.save(rfqVendor);

      // Check if all vendors quoted
      const updatedVendors = await manager.find(RfqVendor, { where: { rfq_id: rfqId } });
      const allQuoted = updatedVendors.every((v) => ['QUOTED', 'REJECTED'].includes(v.status));

      const newStatus = allQuoted ? RfqStatus.FULLY_QUOTED : RfqStatus.PARTIAL_QUOTED;
      await manager.update(Rfq, { id: rfq.id }, { status: newStatus });

      // Notify RFQ creator when vendor submits quote
      if (rfq.created_by) {
        try {
          const { NotificationPublisher } =
            await import('../events/publisher/notificationPublisher');
          await NotificationPublisher.publishInAppRequest({
            recipientId: rfq.created_by,
            title: allQuoted ? 'All Vendors Have Quoted' : 'Vendor Quote Received',
            message: allQuoted
              ? `All vendors have submitted their quotes for RFQ [${rfq.rfq_number}]. You can now compare and award.`
              : `${vendor.name} has submitted a quote for RFQ [${rfq.rfq_number}].`,
            type: allQuoted ? 'RFQ_FULLY_QUOTED' : 'VENDOR_QUOTE_RECEIVED',
            referenceId: rfq.id,
            referenceType: 'QUOTATION',
          });
        } catch (err) {
          logger.error('Failed to notify RFQ creator on vendor quote', err);
        }
      }

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
          const rate = vq.exchange_rate_snapshot != null ? Number(vq.exchange_rate_snapshot) : null;
          const unitPrice = vi ? Number(vi.unit_price) : null;
          return {
            vendorId: vq.vendor_id,
            vendorName: vq.vendor?.name,
            stockStatus: vi?.stock_status ?? null,
            unitPrice,
            totalPrice: vi ? Number(vi.total_price) : null,
            // Branch-currency equivalents (null when no rate was snapshotted).
            convertedUnitPrice:
              unitPrice !== null && rate !== null ? round2(unitPrice * rate) : null,
            estimatedShipmentDate: vi ? vi.estimated_shipment_date : null,
          };
        })
        .filter((vp) => vp.unitPrice !== null);

      // Vendors may quote in different currencies — compare in branch currency
      // when converted values exist, raw otherwise. Out-of-stock lines quote
      // 0 and must never win "lowest price" against a vendor who can deliver.
      const comparableUnit = (vp: (typeof vendorPrices)[number]) =>
        vp.convertedUnitPrice ?? (vp.unitPrice as number);
      const inStockPrices = vendorPrices.filter((vp) => vp.stockStatus !== 'OUT_OF_STOCK');
      const lowestPrice =
        inStockPrices.length > 0 ? Math.min(...inStockPrices.map(comparableUnit)) : null;

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
          isLowest:
            lowestPrice !== null &&
            vp.stockStatus !== 'OUT_OF_STOCK' &&
            comparableUnit(vp) === lowestPrice,
          percentDiff:
            lowestPrice && vp.stockStatus !== 'OUT_OF_STOCK'
              ? ((comparableUnit(vp) - lowestPrice) / lowestPrice) * 100
              : 0,
        })),
      };
    });

    // A vendor who marked every requested item OUT_OF_STOCK has nothing to
    // offer — must never win "cheapest" (their total is 0) or be awardable.
    const isVendorAllOutOfStock = (vq: RfqVendor) =>
      (vq.items?.length ?? 0) > 0 && vq.items.every((i) => i.stock_status === 'OUT_OF_STOCK');

    // Cheapest is decided on the branch-currency amount so quotes in
    // different vendor currencies compare fairly.
    const comparableTotal = (vq: RfqVendor) =>
      vq.branch_converted_amount != null
        ? Number(vq.branch_converted_amount)
        : Number(vq.total_quoted_amount);
    const biddableQuotes = validQuotes.filter((vq) => !isVendorAllOutOfStock(vq));
    const cheapestVendor =
      biddableQuotes.length > 0
        ? biddableQuotes.reduce((prev, curr) =>
            comparableTotal(curr) < comparableTotal(prev) ? curr : prev,
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
        allOutOfStock: isVendorAllOutOfStock(vq),
        vendorCurrency: vq.vendor_currency_code || vq.vendor?.currency || 'QAR',
        branchCurrency: vq.branch_currency_code || null,
        convertedAmount:
          vq.branch_converted_amount != null ? Number(vq.branch_converted_amount) : null,
        exchangeRate: vq.exchange_rate_snapshot != null ? Number(vq.exchange_rate_snapshot) : null,
        rateFetchedAt: vq.exchange_rate_fetched_at ?? null,
        isCheapest: cheapestVendor ? vq.id === cheapestVendor.id : false,
      })),
    };
  }

  async awardVendor(rfqId: string, vendorId: string, warehouseId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Use pessimistic Write lock if supported, to strictly prevent concurrent award races
      const rfq = await manager.findOne(Rfq, {
        where: { id: rfqId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!rfq) throw new AppError('RFQ not found', 404);
      if (rfq.status !== RfqStatus.FULLY_QUOTED) {
        throw new AppError('RFQ must be fully quoted (all vendors responded) before award', 400);
      }

      // A delivery warehouse must be known at award time: it goes into the
      // award email so the vendor knows where to ship, and downstream lot
      // creation inherits it so a lot can never end up warehouse-less.
      if (!warehouseId) {
        throw new AppError(
          'A delivery warehouse is required to award a vendor — the vendor needs to know where to ship the items.',
          400,
        );
      }
      const warehouse = await manager.findOne(Warehouse, {
        where: { id: warehouseId, branchId: rfq.branch_id },
      });
      if (!warehouse) {
        throw new AppError('Selected warehouse was not found for this branch.', 404);
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

      // Snapshot the live vendor→branch exchange rate at award time. This is
      // the rate the whole downstream flow (lot, purchase record, inventory
      // purchase prices) is priced at — awarding without a rate is not allowed.
      const branch = await manager.findOne(Branch, { where: { id: rfq.branch_id } });
      const branchCurrency = branch?.currency_code || 'QAR';
      const vendorCurrency =
        targetVendor.vendor_currency_code || targetVendor.vendor?.currency || 'QAR';
      let awardRate: number;
      let awardRateFetchedAt: Date;
      try {
        const result = await getExchangeRate(manager, vendorCurrency, branchCurrency);
        awardRate = result.rate;
        awardRateFetchedAt = result.fetchedAt;
      } catch {
        throw new AppError(
          `Cannot award: live exchange rate ${vendorCurrency} → ${branchCurrency} is unavailable. Try again shortly.`,
          503,
        );
      }
      targetVendor.vendor_amount = Number(targetVendor.total_quoted_amount);
      targetVendor.branch_currency_code = branchCurrency;
      targetVendor.branch_converted_amount = round2(
        Number(targetVendor.total_quoted_amount) * awardRate,
      );
      targetVendor.exchange_rate_snapshot = awardRate;
      targetVendor.exchange_rate_fetched_at = awardRateFetchedAt;

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
              warehouseName: warehouse.warehouseName,
              warehouseAddress: warehouse.address ?? '',
              warehouseLocation: warehouse.location ?? '',
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

      // Snapshot domestic vs international classification ONCE, at award time —
      // this is the first point a single winning vendor is known. Compares the
      // awarded vendor's country to the purchasing branch's country. Never
      // recalculated afterwards, even if the vendor's country is later edited.
      const awardedVendorCountry =
        targetVendor.vendor?.countryCode ??
        (await manager.findOne(Vendor, { where: { id: targetVendor.vendor_id } }))?.countryCode;
      rfq.purchase_origin = classifyPurchaseOrigin(branch?.country_code, awardedVendorCountry);

      rfq.status = RfqStatus.AWARDED;
      rfq.awarded_vendor_id = targetVendor.vendor_id;
      rfq.awarded_warehouse_id = warehouseId;
      await manager.save(rfq);

      logger.info('Purchase origin classified at award', {
        rfqId,
        branchCountry: branch?.country_code,
        vendorCountry: awardedVendorCountry,
        purchaseOrigin: rfq.purchase_origin,
      });

      // Notify RFQ creator on award
      if (rfq.created_by) {
        try {
          const { NotificationPublisher } =
            await import('../events/publisher/notificationPublisher');
          const awardedVendorName = targetVendor.vendor?.name || 'the selected vendor';
          await NotificationPublisher.publishInAppRequest({
            recipientId: rfq.created_by,
            title: 'RFQ Awarded',
            message: `RFQ [${rfq.rfq_number}] has been awarded to ${awardedVendorName}. You can now create a lot from this RFQ.`,
            type: 'RFQ_AWARDED',
            referenceId: rfq.id,
            referenceType: 'QUOTATION',
          });
        } catch (err) {
          logger.error('Failed to notify RFQ creator on award', err);
        }
      }

      logger.info('Vendor awarded successfully', {
        rfqId,
        awardedVendorId: vendorId,
        vendorCurrency,
        branchCurrency,
        awardRate,
      });
      return {
        success: true,
        message: 'Vendor awarded successfully',
        rfq,
        conversion: {
          vendorCurrency,
          branchCurrency,
          rate: awardRate,
          vendorAmount: Number(targetVendor.total_quoted_amount),
          convertedAmount: targetVendor.branch_converted_amount,
          fetchedAt: awardRateFetchedAt,
        },
      };
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

      // Normally already set by awardVendor; the explicit param only exists to
      // recover RFQs awarded before this field existed, which have none.
      const finalWarehouseId = warehouseId || rfq.awarded_warehouse_id;
      if (!finalWarehouseId) {
        throw new AppError(
          'Warehouse is required to create a lot — this RFQ was awarded without a delivery warehouse set.',
          400,
        );
      }

      const awardedVendor = await manager.findOne(RfqVendor, {
        where: { rfq_id: rfqId, status: RfqVendorStatus.AWARDED },
        relations: ['items', 'items.rfq_item'],
      });

      if (!awardedVendor) throw new AppError('Awarded vendor data not found', 500);

      // Everything from the lot down (lot amounts, purchase record, inventory
      // purchase prices) is stored in the BRANCH currency, converted once at
      // the award-time snapshot rate. Older awards without a snapshot fetch
      // the rate now instead.
      const branch = await manager.findOne(Branch, { where: { id: rfq.branch_id } });
      const branchCurrency = branch?.currency_code || 'QAR';
      const vendorCurrency = awardedVendor.vendor_currency_code || 'QAR';
      const isConverted = vendorCurrency !== branchCurrency;
      const rate = awardedVendor.exchange_rate_snapshot
        ? Number(awardedVendor.exchange_rate_snapshot)
        : (await getExchangeRate(manager, vendorCurrency, branchCurrency)).rate;

      const date = new Date();
      const lotNumber = `LOT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const lot = manager.create(Lot, {
        lotNumber,
        vendorId: awardedVendor.vendor_id,
        purchaseDate: new Date(),
        totalAmount: round2(Number(awardedVendor.total_quoted_amount) * rate),
        status: LotStatus.PENDING,
        branch_id: rfq.branch_id,
        warehouse_id: finalWarehouseId,
        createdBy: userId,
        notes: `Auto-generated from RFQ ${rfq.rfq_number}`,
        currencyCode: branchCurrency,
        exchangeRateSnapshot: isConverted ? rate : undefined,
        // Carry the snapshot down so lot-level spend reporting is tagged too.
        purchaseOrigin: rfq.purchase_origin,
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

        // A custom (not-yet-cataloged) spare part carries its brand on the RFQ
        // item (brand_id or free-text custom_brand_name) — SparePart-linked
        // items already expose brand via the sparePart relation, so this only
        // needs resolving for the uncataloged case.
        let brand: string | undefined;
        if (itemType === LotItemType.SPARE_PART && !sparePartId) {
          if (quotedItem.rfq_item.custom_brand_name) {
            brand = quotedItem.rfq_item.custom_brand_name;
          } else if (quotedItem.rfq_item.brand_id) {
            const rfqItemBrand = await manager.findOne(Brand, {
              where: { id: quotedItem.rfq_item.brand_id },
            });
            brand = rfqItemBrand?.name;
          }
        }

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
          brand,
          mpn: quotedItem.rfq_item.mpn,
          hsCode: quotedItem.rfq_item.hs_code,
          compatibleModels: quotedItem.rfq_item.compatible_models,
          modelIds: quotedItem.rfq_item.modelIds,
          expectedQuantity: quotedItem.available_quantity ?? quotedItem.rfq_item.quantity,
          // Quoted in the vendor's currency — stored in branch currency.
          unitPrice: round2(Number(quotedItem.unit_price) * rate),
          totalPrice: round2(Number(quotedItem.total_price) * rate),
        });

        lotItemsToSave.push(lotItem);
      }

      await manager.save(lotItemsToSave);

      const vendor = await manager.findOne(Vendor, { where: { id: lot.vendorId } });

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
        // Snapshot on the financial record powers the spend dashboard directly.
        purchaseOrigin: rfq.purchase_origin,

        // Vendor snapshot
        vendorVatNumber: vendor?.vatNumber ?? null,
        vendorCountry: vendor?.countryCode ?? null,
        vendorStateProvince: vendor?.stateProvince ?? null,
        vendorCity: vendor?.city ?? null,

        // Currency inherited from lot
        currencyCode: lot.currencyCode ?? null,
        exchangeRate: lot.exchangeRateSnapshot ? Number(lot.exchangeRateSnapshot) : null,

        // Tax rate and name from branch
        taxPercent: branch?.tax_percent != null ? Number(branch.tax_percent) : null,
        taxName: branch?.tax_name ?? null,

        // Taxable amount (initially purchaseAmount since labour, shipping, etc. are 0)
        taxableAmount: lot.totalAmount,
      });

      if (purchase.taxPercent != null && purchase.taxableAmount != null) {
        if (purchase.purchaseOrigin === 'DOMESTIC') {
          purchase.inputVatAmount =
            Number(purchase.taxableAmount) * (Number(purchase.taxPercent) / 100);
          purchase.reverseChargeVatAmount = null;
        } else if (purchase.purchaseOrigin === 'INTERNATIONAL') {
          purchase.reverseChargeVatAmount =
            Number(purchase.taxableAmount) * (Number(purchase.taxPercent) / 100);
          purchase.inputVatAmount = null;
        }
      }
      purchase.vatClaimable = true;
      purchase.taxStatus = 'PENDING';

      await manager.save(Purchase, purchase);

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
