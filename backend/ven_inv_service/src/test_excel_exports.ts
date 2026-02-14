import { Source } from './config/db';
import { LotService } from './services/lotService';
import { Vendor } from './entities/vendorEntity';
import { Model } from './entities/modelEntity';
import { SparePart } from './entities/sparePartEntity';
import { LotItemType } from './entities/lotItemEntity';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function testExcelExports() {
  try {
    console.log('Initializing DataSource...');
    await Source.initialize();
    console.log('DataSource initialized.');

    const lotService = new LotService();
    const vendorRepo = Source.getRepository(Vendor);
    const modelRepo = Source.getRepository(Model);
    const sparePartRepo = Source.getRepository(SparePart);

    // Get dependencies
    const vendor = await vendorRepo.findOne({ where: {} });
    const model = await modelRepo.findOne({ where: {} });
    const sparePart = await sparePartRepo.findOne({ where: {} });

    if (!vendor) {
      console.error('No vendor found');
      return;
    }

    console.log(`Found Vendor: ${vendor.name}`);
    if (model) console.log(`Found Model: ${model.model_name}`);
    if (sparePart) console.log(`Found SparePart: ${sparePart.part_name}`);

    // Create a test lot with both products and spare parts
    const timestamp = Date.now();
    const lotData = {
      vendorId: vendor.id,
      lotNumber: `EXPORT-TEST-${timestamp}`,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: 'Test lot for Excel exports',
      items: [] as Array<{
        itemType: LotItemType;
        modelId?: string;
        sparePartId?: string;
        quantity: number;
        unitPrice: number;
      }>,
      transportationCost: 100,
      documentationCost: 50,
      shippingCost: 75,
      groundFieldCost: 0,
      certificationCost: 0,
      labourCost: 0,
    };

    if (model) {
      lotData.items.push({
        itemType: LotItemType.MODEL,
        modelId: model.id,
        quantity: 5,
        unitPrice: 500,
      });
    }

    if (sparePart) {
      lotData.items.push({
        itemType: LotItemType.SPARE_PART,
        sparePartId: sparePart.id,
        quantity: 10,
        unitPrice: 100,
      });
    }

    if (lotData.items.length === 0) {
      console.error('No items to add to lot');
      return;
    }

    console.log('\n=== Creating Test Lot ===');
    const lot = await lotService.createLot(lotData);
    console.log('✓ Lot created:', lot.lotNumber);
    console.log('  Lot ID:', lot.id);
    console.log('  Items:', lot.items.length);

    // Test Products Export
    if (model) {
      console.log('\n=== Testing Products Export ===');
      const productsBuffer = await lotService.generateProductsExcel(lot.id);
      console.log('✓ Products Excel generated');
      console.log('  Buffer size:', productsBuffer.length, 'bytes');

      // Parse and verify
      const workbook = XLSX.read(productsBuffer, { type: 'buffer' });
      console.log('✓ Excel file is valid');
      console.log('  Sheet names:', workbook.SheetNames);

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      console.log('  Headers:', data[0]);
      console.log('  Data rows:', data.length - 1);
      console.log('  First row:', data[1]);

      // Save to file for manual inspection
      fs.writeFileSync('/tmp/test-products.xlsx', productsBuffer);
      console.log('✓ Saved to /tmp/test-products.xlsx');
    }

    // Test Spare Parts Export
    if (sparePart) {
      console.log('\n=== Testing Spare Parts Export ===');
      const sparePartsBuffer = await lotService.generateSparePartsExcel(lot.id);
      console.log('✓ Spare Parts Excel generated');
      console.log('  Buffer size:', sparePartsBuffer.length, 'bytes');

      // Parse and verify
      const workbook = XLSX.read(sparePartsBuffer, { type: 'buffer' });
      console.log('✓ Excel file is valid');
      console.log('  Sheet names:', workbook.SheetNames);

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      console.log('  Headers:', data[0]);
      console.log('  Data rows:', data.length - 1);
      console.log('  First row:', data[1]);

      // Save to file for manual inspection
      fs.writeFileSync('/tmp/test-spareparts.xlsx', sparePartsBuffer);
      console.log('✓ Saved to /tmp/test-spareparts.xlsx');
    }

    console.log('\n=== All Tests Passed ===');
  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
    process.exit(0);
  }
}

testExcelExports();
