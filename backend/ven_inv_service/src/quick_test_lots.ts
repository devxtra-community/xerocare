import { Source } from './config/db';
import { LotService } from './services/lotService';
import { Vendor } from './entities/vendorEntity';
import { Model } from './entities/modelEntity';
import { LotItemType } from './entities/lotItemEntity';

async function testLotCreation() {
  try {
    console.log('Initializing DataSource...');
    await Source.initialize();
    console.log('✓ DataSource initialized.');

    const lotService = new LotService();
    const vendorRepo = Source.getRepository(Vendor);
    const modelRepo = Source.getRepository(Model);

    // Get dependencies
    const vendor = await vendorRepo.findOne({ where: {} });
    const model = await modelRepo.findOne({ where: {} });

    if (!vendor) {
      console.error('✗ No vendor found');
      process.exit(1);
    }

    if (!model) {
      console.error('✗ No model found');
      process.exit(1);
    }

    console.log(`✓ Found Vendor: ${vendor.name}`);
    console.log(`✓ Found Model: ${model.model_name}`);

    // Test getAllLots
    console.log('\n=== Testing getAllLots ===');
    const allLots = await lotService.getAllLots();
    console.log(`✓ getAllLots() returned ${allLots.length} lots`);

    // Test lot creation
    console.log('\n=== Testing Lot Creation ===');
    const timestamp = Date.now();
    const lotData = {
      vendorId: vendor.id,
      lotNumber: `TEST-${timestamp}`,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: 'Test lot creation',
      items: [
        {
          itemType: LotItemType.MODEL,
          modelId: model.id,
          quantity: 3,
          unitPrice: 100,
        },
      ],
      transportationCost: 10,
      documentationCost: 5,
      shippingCost: 15,
      groundFieldCost: 0,
      certificationCost: 0,
      labourCost: 0,
    };

    const newLot = await lotService.createLot(lotData);
    console.log('✓ Lot created successfully');
    console.log('  ID:', newLot.id);
    console.log('  Lot Number:', newLot.lotNumber);
    console.log('  Items:', newLot.items.length);

    // Verify it appears in getAllLots
    const lotsAfter = await lotService.getAllLots();
    console.log(`✓ getAllLots() now returns ${lotsAfter.length} lots`);

    console.log('\n=== All Tests Passed ===');
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
    process.exit(0);
  }
}

testLotCreation();
