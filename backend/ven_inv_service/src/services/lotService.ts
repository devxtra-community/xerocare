import { Source } from '../config/db';
import { Lot, LotStatus } from '../entities/lotEntity';
import { LotItem, LotItemType } from '../entities/lotItemEntity';
import { AppError } from '../errors/appError';
import { EntityManager } from 'typeorm';
import * as XLSX from 'xlsx';
import { SparePart } from '../entities/sparePartEntity';

interface CreateLotItemDto {
  itemType: LotItemType;
  modelId?: string;
  sparePartId?: string;
  brand?: string;
  partName?: string;
  quantity: number;
  unitPrice: number;
}

interface ExcelLotItemRow {
  'Item Type'?: string;
  'Item Name'?: string;
  'Item Code'?: string;
  'Part Name'?: string;
  'Model Name'?: string;
  part_name?: string;
  name?: string;
  model_no?: string;
  Brand?: string;
  brand?: string;
  Quantity?: number | string;
  'Unit Price'?: number | string;
  [key: string]: unknown;
}

interface CreateLotDto {
  vendorId: string;
  lotNumber: string;
  purchaseDate: string; // Date string from frontend
  items: CreateLotItemDto[];
  notes?: string;
  transportationCost?: number;
  documentationCost?: number;
  shippingCost?: number;
  groundFieldCost?: number;
  certificationCost?: number;
  labourCost?: number;
  branchId?: string; // Added for spare part creation & tracking
  createdBy?: string; // Added for tracking who created the lot
}

export class LotService {
  private lotRepository = Source.getRepository(Lot);

  async createLot(data: CreateLotDto): Promise<Lot> {
    return await Source.transaction(async (manager: EntityManager) => {
      // Check if lot number exists
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

      // Costs
      lot.transportationCost = data.transportationCost || 0;
      lot.documentationCost = data.documentationCost || 0;
      lot.shippingCost = data.shippingCost || 0;
      lot.groundFieldCost = data.groundFieldCost || 0;
      lot.certificationCost = data.certificationCost || 0;
      lot.labourCost = data.labourCost || 0;

      // Calculate totals
      let itemsTotal = 0;
      const lotItems: LotItem[] = [];

      for (const itemData of data.items) {
        const lotItem = new LotItem();
        lotItem.itemType = itemData.itemType;
        lotItem.quantity = itemData.quantity;
        lotItem.usedQuantity = 0; // Initial used is 0
        lotItem.unitPrice = itemData.unitPrice;
        lotItem.totalPrice = itemData.quantity * itemData.unitPrice;

        if (itemData.itemType === LotItemType.MODEL) {
          if (!itemData.modelId) throw new AppError('Model ID required for Model item', 400);
          lotItem.modelId = itemData.modelId;
        } else if (itemData.itemType === LotItemType.SPARE_PART) {
          // Support both existing spare part selection and new spare part creation
          if (itemData.sparePartId) {
            // Use existing spare part
            lotItem.sparePartId = itemData.sparePartId;
          } else if (itemData.brand && itemData.partName) {
            // Create new spare part on-the-fly
            if (!data.branchId) {
              throw new AppError('Branch ID is required to create new spare parts', 400);
            }

            const sparePart = new SparePart();
            sparePart.part_name = itemData.partName;
            sparePart.brand = itemData.brand;
            sparePart.base_price = itemData.unitPrice;
            sparePart.quantity = 0; // Will be managed through lot items
            sparePart.branch_id = data.branchId;

            // Generate a unique item_code
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
   * Validates if an item can be added from a lot and increments the used quantity.
   * MUST be called within a transaction if possible, or handles its own transaction.
   * If manager is provided, uses it. Otherwise creates a new transaction.
   */
  async validateAndTrackUsage(
    lotId: string,
    itemType: LotItemType,
    identifier: string, // modelId or item_code (for SparePart)
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
        // For Spare Parts, we match by item_code because SparePart entities are "instances/batches"
        // but the Lot Item refers to a specific "type" represented by a referenced SparePart.
        query.andWhere('sparePart.item_code = :identifier', { identifier });
      }

      // Lock the row to prevent race conditions
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

  async getAllLots(): Promise<Lot[]> {
    return await this.lotRepository.find({
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

  async getLotById(id: string): Promise<Lot> {
    const lot = await this.lotRepository.findOne({
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

    if (!lot) {
      throw new AppError('Lot not found', 404);
    }
    return lot;
  }

  async generateExcel(lotId: string): Promise<Buffer> {
    const lot = await this.getLotById(lotId);

    // Prepare data for Excel
    const rows: (string | number | undefined)[][] = [];

    // 1. Lot Info
    rows.push(['LOT DETAILS']);
    rows.push(['Lot Number', lot.lotNumber]);
    rows.push(['Vendor', lot.vendor?.name || 'N/A']);
    const purchaseDateStr = new Date(lot.purchaseDate).toISOString().split('T')[0];
    rows.push(['Purchase Date', purchaseDateStr]);
    rows.push(['Status', lot.status]);
    rows.push([]); // Empty row

    // 2. Costs
    rows.push(['COST BREAKDOWN']);
    rows.push(['Type', 'Amount']);
    rows.push(['Transportation', lot.transportationCost]);
    rows.push(['Documentation', lot.documentationCost]);
    rows.push(['Shipping', lot.shippingCost]);
    rows.push(['Ground Field', lot.groundFieldCost]);
    rows.push(['Certification', lot.certificationCost]);
    rows.push(['Labour', lot.labourCost]);
    rows.push([]);

    // 3. Items
    rows.push(['LOT ITEMS']);
    const itemHeaders = [
      'Type',
      'Name/Model',
      'Brand',
      'Quantity (Total)',
      'Quantity (Used)',
      'Remaining',
      'Unit Price',
      'Total Price',
    ];
    rows.push(itemHeaders);

    lot.items.forEach((item) => {
      const name =
        item.itemType === LotItemType.MODEL ? item.model?.model_name : item.sparePart?.part_name;
      const brand =
        item.itemType === LotItemType.MODEL
          ? item.model?.brandRelation?.name
          : item.sparePart?.brand;
      const remaining = item.quantity - item.usedQuantity;

      rows.push([
        item.itemType,
        name || 'N/A',
        brand || 'N/A',
        item.quantity,
        item.usedQuantity,
        remaining,
        item.unitPrice,
        item.totalPrice,
      ]);
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Adjust column widths (basic)
    const wscols = [
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, `Lot-${lot.lotNumber.substring(0, 20)}`);

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async processExcelUpload(buffer: Buffer, branchId: string): Promise<Lot> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Helper to get cell value safely
    const getCellValue = (row: number, col: number) => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      return cell ? cell.v : undefined;
    };

    // 1. Extract Lot Information (Hardcoded positions based on template)
    // Row 1 (Index 1): Vendor (Col 1)
    const vendorName = getCellValue(1, 1); // B2
    // Row 2 (Index 2): Lot Number (Col 1)
    const lotNumber = getCellValue(2, 1); // B3
    // Row 3 (Index 3): Purchase Date (Col 1)
    let purchaseDateStr = getCellValue(3, 1); // B4
    // Row 4: Notes
    const notes = getCellValue(4, 1); // B5

    if (!vendorName || !lotNumber || !purchaseDateStr) {
      throw new AppError(
        'Missing Lot Information (Vendor, Lot Number, or Purchase Date). Please use the provided template.',
        400,
      );
    }

    // Handle Excel Date serial number if applicable
    if (typeof purchaseDateStr === 'number') {
      const date = XLSX.SSF.parse_date_code(purchaseDateStr);
      purchaseDateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // 2. Extract Costs (Rows 7-12)
    const getCost = (row: number) => Number(getCellValue(row, 1) || 0);
    const transportationCost = getCost(7);
    const documentationCost = getCost(8);
    const shippingCost = getCost(9);
    const groundFieldCost = getCost(10);
    const certificationCost = getCost(11);
    const labourCost = getCost(12);

    // 3. Extract Items (Table starts at Row 15, Header at Row 15 (Index 14), Data from Row 16 (Index 15))
    // We can use sheet_to_json with range to start reading from the table header
    const itemsData: ExcelLotItemRow[] = XLSX.utils.sheet_to_json(worksheet, { range: 15 }); // 0-indexed, so Row 16

    if (itemsData.length === 0) {
      throw new AppError('No items found in the items list section', 400);
    }

    // --- Vendor Validation ---
    const { Vendor } = await import('../entities/vendorEntity');
    const { Model } = await import('../entities/modelEntity');
    const { SparePart } = await import('../entities/sparePartEntity');

    const vendor = await Source.getRepository(Vendor).findOne({
      where: { name: String(vendorName).trim() },
    });
    if (!vendor) {
      throw new AppError(`Vendor '${vendorName}' not found`, 404);
    }

    // --- Items Processing ---
    const items: CreateLotItemDto[] = [];

    for (const row of itemsData) {
      let itemTypeRaw = row['Item Type']?.toString().trim().toUpperCase();
      let itemName = row['Item Name']?.toString().trim();
      const itemCode = row['Item Code']?.toString().trim();

      // Aliases for Item Name
      if (!itemName) {
        if (row['Part Name']) itemName = row['Part Name'].toString().trim();
        else if (row['Model Name']) itemName = row['Model Name'].toString().trim();
        else if (row['part_name']) itemName = row['part_name'].toString().trim();
        else if (row['name']) itemName = row['name'].toString().trim();
      }

      // Infer Item Type if missing
      if (!itemTypeRaw) {
        if (row['Model Name'] || row['model_no']) itemTypeRaw = 'MODEL';
        else if (row['Part Name'] || itemCode || row['part_name']) itemTypeRaw = 'SPARE PART';
      }

      let brandFromExcel = row['Brand']?.toString().trim();
      if (!brandFromExcel && row['brand']) brandFromExcel = row['brand'].toString().trim();
      const quantity = Number(row['Quantity']);
      const unitPrice = Number(row['Unit Price']);

      // Skip empty rows if any
      if (!itemTypeRaw && !itemName) continue;

      if (!itemTypeRaw || !itemName || isNaN(quantity) || isNaN(unitPrice)) {
        throw new AppError(
          `Invalid data in row for item '${itemName || 'Unknown'}'. Check Type, Name, Qty, Price.`,
          400,
        );
      }

      let itemType: LotItemType;
      if (itemTypeRaw === 'PRODUCT' || itemTypeRaw === 'MODEL') itemType = LotItemType.MODEL;
      else if (itemTypeRaw === 'SPARE PART' || itemTypeRaw === 'SPARE_PART')
        itemType = LotItemType.SPARE_PART;
      else throw new AppError(`Invalid Item Type: ${itemTypeRaw}`, 400);

      const itemDto: CreateLotItemDto = {
        itemType,
        quantity,
        unitPrice,
      };

      if (itemType === LotItemType.MODEL) {
        const model = await Source.getRepository(Model)
          .createQueryBuilder('model')
          .leftJoinAndSelect('model.brandRelation', 'brand')
          .where('LOWER(model.model_name) = LOWER(:name)', { name: itemName })
          .getOne();

        if (!model) throw new AppError(`Model '${itemName}' not found`, 404);

        // Use brand from Excel if provided, otherwise auto-fill from model
        if (brandFromExcel && model.brandRelation?.name) {
          if (brandFromExcel.toLowerCase() !== model.brandRelation.name.toLowerCase()) {
            console.warn(
              `Brand mismatch for ${itemName}: Excel='${brandFromExcel}', Model='${model.brandRelation.name}'. Using Excel value.`,
            );
          }
        }

        itemDto.modelId = model.id;
      } else {
        let sparePart: SparePart | null = null;

        // Try to find by Item Code first if provided
        if (itemCode) {
          sparePart = await Source.getRepository(SparePart).findOne({
            where: { item_code: itemCode },
          });
        }

        // If not found by code, try by name
        if (!sparePart && itemName) {
          sparePart = await Source.getRepository(SparePart)
            .createQueryBuilder('sp')
            .where('LOWER(sp.part_name) = LOWER(:name)', { name: itemName })
            .getOne();
        }

        if (!sparePart) {
          // Create new spare part if brand is provided
          if (brandFromExcel) {
            itemDto.brand = brandFromExcel;
            itemDto.partName = itemName;
          } else {
            throw new AppError(
              `Spare Part '${itemName}' not found and no Brand provided to create it`,
              404,
            );
          }
        } else {
          // Use brand from Excel if provided and mismatch, otherwise auto-fill from spare part
          if (brandFromExcel && sparePart.brand) {
            if (brandFromExcel.toLowerCase() !== sparePart.brand.toLowerCase()) {
              console.warn(
                `Brand mismatch for ${itemName}: Excel='${brandFromExcel}', SparePart='${sparePart.brand}'. Using Excel value.`,
              );
            }
          }
          itemDto.sparePartId = sparePart.id;
        }
      }

      items.push(itemDto);
    }

    const createLotDto: CreateLotDto = {
      vendorId: vendor.id,
      lotNumber: String(lotNumber).trim(),
      purchaseDate: String(purchaseDateStr),

      items,
      transportationCost,
      documentationCost,
      shippingCost,
      groundFieldCost,
      certificationCost,
      labourCost,
      notes: notes ? String(notes).trim() : 'Uploaded via Excel',
      branchId, // Pass branchId to createLot
    };

    return this.createLot(createLotDto);
  }

  async generateProductsExcel(lotId: string): Promise<Buffer> {
    const lot = await this.getLotById(lotId);

    // Filter only MODEL items
    const productItems = lot.items.filter((item) => item.itemType === LotItemType.MODEL);

    if (productItems.length === 0) {
      throw new AppError('No products found in this lot', 404);
    }

    // Prepare data for Excel - matching BulkProductRow interface
    const rows: (string | number)[][] = [];

    // Header row
    rows.push([
      'model_no',
      'warehouse_id',
      'vendor_id',
      'product_status',
      'serial_no',
      'name',
      'brand',
      'MFD',
      'sale_price',
      'tax_rate',
      'print_colour',
      'max_discount_amount',
      'lot_id',
    ]);

    // Data rows - one row per remaining quantity
    productItems.forEach((item) => {
      const remaining = item.quantity - item.usedQuantity;
      const modelId = item.modelId || '';
      const modelName = item.model?.model_name || '';
      const brandName = item.model?.brandRelation?.name || '';

      // Create one row per remaining item
      for (let i = 0; i < remaining; i++) {
        rows.push([
          modelId, // model_no
          '', // warehouse_id (user fills)
          lot.vendorId, // vendor_id
          'IN_STOCK', // product_status (default)
          '', // serial_no (user fills)
          modelName, // name
          brandName, // brand
          '', // MFD (user fills)
          item.unitPrice, // sale_price
          '', // tax_rate (user fills)
          '', // print_colour (optional)
          '', // max_discount_amount (optional)
          lot.id, // lot_id
        ]);
      }
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Adjust column widths
    const wscols = [
      { wch: 38 }, // model_no (UUID)
      { wch: 38 }, // warehouse_id (UUID)
      { wch: 38 }, // vendor_id (UUID)
      { wch: 15 }, // product_status
      { wch: 20 }, // serial_no
      { wch: 30 }, // name
      { wch: 20 }, // brand
      { wch: 12 }, // MFD
      { wch: 12 }, // sale_price
      { wch: 10 }, // tax_rate
      { wch: 15 }, // print_colour
      { wch: 20 }, // max_discount_amount
      { wch: 38 }, // lot_id (UUID)
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, `Products-${lot.lotNumber.substring(0, 20)}`);

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async generateSparePartsExcel(lotId: string): Promise<Buffer> {
    const lot = await this.getLotById(lotId);

    // Filter only SPARE_PART items
    const sparePartItems = lot.items.filter((item) => item.itemType === LotItemType.SPARE_PART);

    if (sparePartItems.length === 0) {
      throw new AppError('No spare parts found in this lot', 404);
    }

    // Prepare data for Excel - matching BulkUploadRow interface
    const rows: (string | number)[][] = [];

    // Header row
    rows.push(['part_name', 'brand', 'model_id', 'base_price', 'quantity', 'lot_id']);

    // Data rows
    sparePartItems.forEach((item) => {
      const remaining = item.quantity - item.usedQuantity;
      const partName = item.sparePart?.part_name || '';
      const brand = item.sparePart?.brand || '';
      const modelId = item.sparePart?.model_id || '';

      rows.push([
        partName, // part_name
        brand, // brand
        modelId, // model_id (optional)
        item.unitPrice, // base_price
        remaining, // quantity (remaining)
        lot.id, // lot_id
      ]);
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Adjust column widths
    const wscols = [
      { wch: 20 }, // item_code
      { wch: 30 }, // part_name
      { wch: 20 }, // brand
      { wch: 38 }, // model_id (UUID, optional)
      { wch: 12 }, // base_price
      { wch: 10 }, // quantity
      { wch: 38 }, // lot_id (UUID)
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `SpareParts-${lot.lotNumber.substring(0, 20)}`,
    );

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
