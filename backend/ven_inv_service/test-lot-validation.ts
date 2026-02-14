import { Source } from './src/config/db';
import { LotService } from './src/services/lotService';
import { ProductService } from './src/services/productService';
import { ProductStatus, PrintColour } from './src/entities/productEntity';
import { LotItemType } from './src/entities/lotItemEntity';
import { Vendor } from './src/entities/vendorEntity';
import { Model } from './src/entities/modelEntity';
import { Warehouse } from './src/entities/warehouseEntity';

async function main() {
  try {
    console.log('Initializing DataSource...');
    await Source.initialize();
    console.log('DataSource initialized.');

    const lotService = new LotService();
    const productService = new ProductService();
    const vendorRepo = Source.getRepository(Vendor);
    const modelRepo = Source.getRepository(Model);
    const warehouseRepo = Source.getRepository(Warehouse);

    // 1. Get Dependencies
    const vendor = await vendorRepo.findOne({ where: {} });
    const model = await modelRepo.findOne({ where: {}, relations: ['brandRelation'] });
    const warehouse = await warehouseRepo.findOne({ where: {} });

    if (!vendor || !model || !warehouse) {
      console.error('Missing dependencies (Vendor, Model, or Warehouse). Cannot run test.');
      process.exit(1);
    }

    console.log(
      `Using Vendor: ${vendor.name}, Model: ${model.model_name}, Warehouse: ${warehouse.warehouseName}`,
    );

    // 2. Create Lot with Model (Qty 2)
    const timestamp = Date.now();
    const lotNumber = `TEST-LOT-${timestamp}`;
    console.log(`Creating Lot ${lotNumber} with 2 items of Model ${model.model_name}...`);

    const lotData = {
      vendorId: vendor.id,
      lotNumber: lotNumber,
      purchaseDate: new Date().toISOString().split('T')[0],
      items: [
        {
          itemType: LotItemType.MODEL,
          modelId: model.id,
          quantity: 2,
          unitPrice: 500,
        },
      ],
    };

    const lot = await lotService.createLot(lotData);
    console.log(`Lot created with ID: ${lot.id}`);

    // 3. Add Product 1 (Should Success)
    console.log('--- Test 1: Add Product 1 (Valid) ---');
    try {
      await productService.addProduct({
        vendor_id: vendor.id,
        serial_no: `SN-${timestamp}-1`,
        name: `Test Product 1`,
        brand: model.brandRelation?.name || 'Generic',
        MFD: new Date(),
        sale_price: 1000,
        tax_rate: 10,
        model_id: model.id,
        warehouse_id: warehouse.id,
        product_status: ProductStatus.AVAILABLE,
        print_colour: PrintColour.BLACK_WHITE,
        max_discount_amount: 0,
        lot_id: lot.id,
      });
      console.log('✅ Product 1 created successfully.');
    } catch (error: unknown) {
      console.error('❌ Product 1 creation failed:', (error as Error).message);
    }

    // 4. Add Product 2 (Should Success)
    console.log('--- Test 2: Add Product 2 (Valid - Reaches Limit) ---');
    try {
      await productService.addProduct({
        vendor_id: vendor.id,
        serial_no: `SN-${timestamp}-2`,
        name: `Test Product 2`,
        brand: model.brandRelation?.name || 'Generic',
        MFD: new Date(),
        sale_price: 1000,
        tax_rate: 10,
        model_id: model.id,
        warehouse_id: warehouse.id,
        product_status: ProductStatus.AVAILABLE,
        print_colour: PrintColour.BLACK_WHITE,
        max_discount_amount: 0,
        lot_id: lot.id,
      });
      console.log('✅ Product 2 created successfully.');
    } catch (error: unknown) {
      console.error('❌ Product 2 creation failed:', (error as Error).message);
    }

    // 5. Add Product 3 (Should FAIL - Limit Exceeded)
    console.log('--- Test 3: Add Product 3 (Invalid - Limit Exceeded) ---');
    try {
      await productService.addProduct({
        vendor_id: vendor.id,
        serial_no: `SN-${timestamp}-3`,
        name: `Test Product 3`,
        brand: model.brandRelation?.name || 'Generic',
        MFD: new Date(),
        sale_price: 1000,
        tax_rate: 10,
        model_id: model.id,
        warehouse_id: warehouse.id,
        product_status: ProductStatus.AVAILABLE,
        print_colour: PrintColour.BLACK_WHITE,
        max_discount_amount: 0,
        lot_id: lot.id,
      });
      // If we reach here, it failed (it shouldn't succeed)
      console.log('❌ Product 3 succeeded explicitly (FAIL). Should have been blocked.');
    } catch (error: unknown) {
      // We expect an error here
      console.log('✅ Product 3 blocked as expected:', (error as Error).message);
    }
  } catch (error) {
    console.error('CRASHED:', error);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
    process.exit(0);
  }
}

main();
