import { Source } from './config/db';
import { Vendor } from './entities/vendorEntity';
import { Model } from './entities/modelEntity';
import { SparePart } from './entities/sparePartEntity';
import { LotItemType } from './entities/lotItemEntity';

async function testLotCreation() {
  try {
    console.log('Initializing DataSource...');
    await Source.initialize();
    console.log('DataSource initialized.');

    const vendorRepo = Source.getRepository(Vendor);
    const modelRepo = Source.getRepository(Model);
    const sparePartRepo = Source.getRepository(SparePart);

    // Get first vendor, model, and spare part
    const vendor = await vendorRepo.findOne({ where: {} });
    const model = await modelRepo.findOne({ where: {} });
    const sparePart = await sparePartRepo.findOne({ where: {} });

    if (!vendor) {
      console.error('No vendor found in database');
      return;
    }

    console.log(`Found Vendor: ${vendor.name} (${vendor.id})`);
    if (model) console.log(`Found Model: ${model.model_name} (${model.id})`);
    if (sparePart) console.log(`Found SparePart: ${sparePart.part_name} (${sparePart.id})`);

    // Create lot data
    const timestamp = Date.now();
    const lotData = {
      vendorId: vendor.id,
      lotNumber: `TEST-LOT-${timestamp}`,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: 'Test lot creation',
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

    // Add items based on what's available
    if (model) {
      lotData.items.push({
        itemType: LotItemType.MODEL,
        modelId: model.id,
        quantity: 10,
        unitPrice: 500,
      });
    }

    if (sparePart) {
      lotData.items.push({
        itemType: LotItemType.SPARE_PART,
        sparePartId: sparePart.id,
        quantity: 20,
        unitPrice: 100,
      });
    }

    if (lotData.items.length === 0) {
      console.error('No items to add to lot (no models or spare parts found)');
      return;
    }

    console.log('\n=== Testing Lot Creation ===');
    console.log('Lot Data:', JSON.stringify(lotData, null, 2));

    // Test via API (you'll need a valid token)
    // For now, let's just use the service directly
    const { LotService } = await import('./services/lotService');
    const lotService = new LotService();

    console.log('\nCreating lot via service...');
    const createdLot = await lotService.createLot(lotData);
    console.log('✓ Lot created successfully!');
    console.log('Lot ID:', createdLot.id);
    console.log('Lot Number:', createdLot.lotNumber);
    console.log('Total Amount:', createdLot.totalAmount);
    console.log('Items count:', createdLot.items?.length || 0);

    // Verify it was saved
    console.log('\nFetching lot by ID...');
    const fetchedLot = await lotService.getLotById(createdLot.id);
    console.log('✓ Lot fetched successfully!');
    console.log('Fetched Lot Number:', fetchedLot.lotNumber);
    console.log('Fetched Items count:', fetchedLot.items?.length || 0);

    // List all lots
    console.log('\nFetching all lots...');
    const allLots = await lotService.getAllLots();
    console.log(`✓ Total lots in database: ${allLots.length}`);
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

testLotCreation();
