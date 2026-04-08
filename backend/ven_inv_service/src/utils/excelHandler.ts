import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';
import { AppError } from '../errors/appError';
import { CreateLotDto, CreateLotItemDto, ExcelLotItemRow } from '../types/lotTypes';
import { LotItemType } from '../entities/lotItemEntity';
import { Source } from '../config/db';
import { Model } from '../entities/modelEntity';
import { SparePart } from '../entities/sparePartEntity';
import { Vendor } from '../entities/vendorEntity';
import { Lot } from '../entities/lotEntity';

export class ExcelHandler {
  async processExcelUpload(buffer: Buffer, branchId: string): Promise<CreateLotDto> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const getCellValue = (row: number, col: number) => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      return cell ? cell.v : undefined;
    };

    const vendorName = getCellValue(1, 1);
    const lotNumber = getCellValue(2, 1);
    let purchaseDateStr = getCellValue(3, 1);
    const notes = getCellValue(4, 1);

    if (!vendorName || !lotNumber || !purchaseDateStr) {
      throw new AppError(
        'Missing Lot Information (Vendor, Lot Number, or Purchase Date). Please use the provided template.',
        400,
      );
    }

    if (typeof purchaseDateStr === 'number') {
      const date = XLSX.SSF.parse_date_code(purchaseDateStr);
      purchaseDateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    const itemsData: ExcelLotItemRow[] = XLSX.utils.sheet_to_json(worksheet, { range: 15 });

    if (itemsData.length === 0) {
      throw new AppError('No items found in the items list section', 400);
    }

    const vendor = await Source.getRepository(Vendor).findOne({
      where: { name: String(vendorName).trim() },
    });
    if (!vendor) {
      throw new AppError(`Vendor '${vendorName}' not found`, 404);
    }

    const items: CreateLotItemDto[] = [];

    for (const row of itemsData) {
      let itemTypeRaw = row['Item Type']?.toString().trim().toUpperCase();
      let itemName = row['Item Name']?.toString().trim();
      const sku = row['SKU']?.toString().trim();
      const mpn =
        row['MPN']?.toString().trim() ||
        row['mpn']?.toString().trim() ||
        row['Manufacturing Part Number']?.toString().trim();
      const compatibleModels =
        row['Compatible Models']?.toString().trim() ||
        row['compatible_models']?.toString().trim() ||
        row['Compatible Model']?.toString().trim() ||
        row['compatible_model']?.toString().trim();
      const modelIdsRaw = row['model_ids'] || row['Model IDs'];
      const modelIds = Array.isArray(modelIdsRaw)
        ? modelIdsRaw
        : typeof modelIdsRaw === 'string'
          ? modelIdsRaw.split(',')
          : [];
      const sellingPrice = Number(
        row['Selling Price'] || row['Retail Price'] || row['selling_price'] || 0,
      );

      if (!itemName) {
        if (row['Part Name']) itemName = row['Part Name'].toString().trim();
        else if (row['Model Name']) itemName = row['Model Name'].toString().trim();
        else if (row['part_name']) itemName = row['part_name'].toString().trim();
        else if (row['name']) itemName = row['name'].toString().trim();
      }

      if (!itemTypeRaw) {
        if (row['Model Name'] || row['model_no']) itemTypeRaw = 'MODEL';
        else if (row['Part Name'] || sku || row['part_name']) itemTypeRaw = 'SPARE PART';
      }

      let brandFromExcel = row['Brand']?.toString().trim();
      if (!brandFromExcel && row['brand']) brandFromExcel = row['brand'].toString().trim();
      const quantity = Number(row['Quantity']);
      const unitPrice = Number(row['Unit Price']);

      // Parse Model ID or Compatible Model for Spare Parts
      let modelIdFromExcel = row['model_id']?.toString().trim();
      if (!modelIdFromExcel && row['Model ID'])
        modelIdFromExcel = row['Model ID'].toString().trim();

      const compatibleModelName =
        row['compatible_model']?.toString().trim() || row['Compatible Model']?.toString().trim();

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
        sellingPrice,
        mpn,
        compatibleModels,
        modelIds,
      };

      if (itemType === LotItemType.MODEL) {
        const model = await Source.getRepository(Model)
          .createQueryBuilder('model')
          .leftJoinAndSelect('model.brandRelation', 'brand')
          .where('LOWER(model.model_name) = LOWER(:name)', { name: itemName })
          .getOne();

        if (!model) throw new AppError(`Model '${itemName}' not found`, 404);

        itemDto.modelId = model.id;
      } else {
        let sparePart: SparePart | null = null;

        if (sku) {
          sparePart = await Source.getRepository(SparePart).findOne({
            where: { sku: sku },
            relations: { model: true },
          });
        }

        if (!sparePart && itemName) {
          // Improve lookup to include brand if available to reduce false positives
          const query = Source.getRepository(SparePart)
            .createQueryBuilder('sp')
            .leftJoinAndSelect('sp.model', 'model')
            .where('LOWER(sp.part_name) = LOWER(:name)', { name: itemName });

          if (brandFromExcel) {
            query.andWhere('LOWER(sp.brand) = LOWER(:brand)', { brand: brandFromExcel });
          }

          sparePart = await query.getOne();
        }

        if (!sparePart) {
          if (brandFromExcel) {
            itemDto.brand = brandFromExcel;
            itemDto.partName = itemName;
            // Pass the modelId if found in Excel
            if (modelIdFromExcel) {
              itemDto.modelId = modelIdFromExcel;
            } else if (compatibleModelName && compatibleModelName.toLowerCase() !== 'universal') {
              // Try to find model by name if ID not provided
              const model = await Source.getRepository(Model).findOne({
                where: { model_name: compatibleModelName },
              });
              if (model) {
                itemDto.modelId = model.id;
              }
            } else if (compatibleModelName && compatibleModelName.toLowerCase() === 'universal') {
              itemDto.modelId = 'universal';
            }
          } else {
            throw new AppError(
              `Spare Part '${itemName}' not found and no Brand provided to create it`,
              404,
            );
          }
        } else {
          itemDto.sparePartId = sparePart.id;
        }
      }

      items.push(itemDto);
    }

    return {
      vendorId: vendor.id,
      lotNumber: String(lotNumber).trim(),
      purchaseDate: String(purchaseDateStr),
      items,
      notes: notes ? String(notes) : undefined,
      branchId,
      createdBy: 'EXCEL_UPLOAD',
    };
  }

  async generateExcel(lot: Lot): Promise<Buffer> {
    const rows: (string | number | undefined)[][] = [];

    rows.push(['LOT DETAILS']);
    rows.push(['Lot Number', lot.lotNumber]);
    rows.push(['Vendor', lot.vendor?.name || 'N/A']);
    const purchaseDateStr = new Date(lot.purchaseDate).toISOString().split('T')[0];
    rows.push(['Purchase Date', purchaseDateStr]);
    rows.push(['Status', lot.status]);
    rows.push([]);

    rows.push(['LOT ITEMS']);
    const itemHeaders = [
      'Type',
      'Name/Model',
      'Brand',
      'Manufacturing Part Number',
      'Compatible Models',
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
      const remaining = item.expectedQuantity - item.usedQuantity;

      rows.push([
        item.itemType,
        name || 'N/A',
        brand || 'N/A',
        item.sparePart?.mpn || item.mpn || 'N/A',
        item.sparePart?.compatible_models || item.compatibleModels || 'N/A',
        item.expectedQuantity,
        item.usedQuantity,
        remaining,
        item.unitPrice,
        item.totalPrice,
      ]);
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    const wscols = [
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 }, // mpn
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

  async generateProductsExcel(lot: Lot): Promise<Buffer> {
    const productItems = lot.items.filter((item) => item.itemType === LotItemType.MODEL);

    if (productItems.length === 0) {
      throw new AppError('No products found in this lot', 404);
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(`Products-${lot.lotNumber.substring(0, 20)}`);

    const headers = [
      'model_no',
      'Select Product from Lot',
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
    ];

    worksheet.addRow(headers);

    productItems.forEach((item) => {
      const remaining = item.expectedQuantity - item.usedQuantity;
      const modelId = item.modelId || '';
      const modelName = item.model?.model_name || '';
      const modelNo = item.model?.model_no || '';
      const brandName = item.model?.brandRelation?.name || '';
      const selectProductFromLot = `${modelName} (${modelNo})`;

      for (let i = 0; i < remaining; i++) {
        worksheet.addRow([
          modelId,
          selectProductFromLot,
          lot.warehouse_id || '',
          lot.vendorId,
          'AVAILABLE',
          '', // serial_no
          modelName, // name — autofill with model name
          brandName,
          '',
          item.unitPrice,
          '',
          '', // print_colour — dropdown added below
          '',
          lot.id,
        ]);
      }
    });

    // Add Data Validation (Dropdown) to 'print_colour' column (Column L / Index 12)
    const printColourOptions = ['both', 'black and white', 'colour'];
    const rowCount = worksheet.rowCount;
    if (rowCount > 1) {
      for (let i = 2; i <= rowCount; i++) {
        worksheet.getCell(`L${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${printColourOptions.join(',')}"`],
          showErrorMessage: true,
          errorTitle: 'Invalid Option',
          error: 'Please select an option from the list.',
        };
      }
    }

    // Set column widths
    worksheet.columns = [
      { width: 38 }, // model_no
      { width: 40 }, // Select Product from Lot
      { width: 38 }, // warehouse_id
      { width: 38 }, // vendor_id
      { width: 15 }, // product_status
      { width: 20 }, // serial_no
      { width: 30 }, // name
      { width: 20 }, // brand
      { width: 12 }, // MFD
      { width: 12 }, // sale_price
      { width: 10 }, // tax_rate
      { width: 15 }, // print_colour
      { width: 20 }, // max_discount_amount
      { width: 38 }, // lot_id
    ];

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  generateSparePartsExcel(lot: Lot): Buffer {
    const sparePartItems = lot.items.filter((item) => item.itemType === LotItemType.SPARE_PART);

    if (sparePartItems.length === 0) {
      throw new AppError('No spare parts found in this lot', 404);
    }

    const rows: (string | number)[][] = [];

    rows.push([
      'sku',
      'part_name',
      'brand',
      'Manufacturing Part Number',
      'Select Spare Parts from Lot',
      'Compatible Model',
      'model_id',
      'Compatible Models',
      'base_price',
      'quantity',
      'lot_id',
      'warehouse_id',
    ]);

    sparePartItems.forEach((item) => {
      const remaining = item.receivedQuantity - item.usedQuantity;
      const sku = item.sparePart?.sku || '';
      const partName = item.sparePart?.part_name || '';
      const brand = item.sparePart?.brand || '';
      // Use the model linked to the spare part master record (item.sparePart.model),
      // NOT item.model which is always null for SPARE_PART lot items.
      const sparePartModel = item.sparePart?.model;
      const modelId = item.sparePart?.model_id || sparePartModel?.id || '';

      // For spare parts, the 'Select Spare Parts from Lot' column should be the part name itself
      const selectSparePartFromLot = `${sku} - ${partName}`;

      rows.push([
        sku,
        partName,
        brand,
        item.sparePart?.mpn || item.mpn || '',
        selectSparePartFromLot,
        sparePartModel?.model_name || 'Universal',
        modelId,
        item.compatibleModels || '',
        item.unitPrice,
        remaining,
        lot.id,
        lot.warehouse_id || '',
      ]);
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    const wscols = [
      { wch: 15 }, // sku
      { wch: 20 }, // part_name
      { wch: 15 }, // brand
      { wch: 20 }, // mpn
      { wch: 30 }, // Select Spare Parts from Lot
      { wch: 20 }, // compatible_model
      { wch: 38 }, // model_id
      { wch: 40 }, // compatible_models (multi-select text)
      { wch: 12 }, // base_price
      { wch: 10 }, // quantity
      { wch: 38 }, // lot_id
      { wch: 38 }, // warehouse_id
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
