/* eslint-disable */

import { ExcelHandler } from './src/utils/excelHandler';
import { Lot } from './src/entities/lotEntity';
import { LotItem, LotItemType } from './src/entities/lotItemEntity';
import { SparePart } from './src/entities/sparePartEntity';
import { Model } from './src/entities/modelEntity';
import * as XLSX from 'xlsx';

const mockLot = {
  id: 'lot-123',
  lotNumber: 'LKOT-678333',
  items: [
    {
      itemType: LotItemType.SPARE_PART,
      quantity: 10,
      usedQuantity: 0,
      unitPrice: 50,
      sparePart: {
        part_name: 'LCD Screen',
        brand: 'Samsung',
        model: {
          model_name: 'Galaxy S21',
          model_no: 'SM-G991B',
        },
      },
    },
  ],
} as unknown as Lot;

const handler = new ExcelHandler();
try {
  const buffer = handler.generateSparePartsExcel(mockLot);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('Headers:', data[0]);
  console.log('Row 1:', data[1]);
} catch (error) {
  console.error(error);
}
