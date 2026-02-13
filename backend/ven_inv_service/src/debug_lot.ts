import { Source } from './config/db';
import { LotRepository } from './repositories/lotRepository';
import { LotService } from './services/lotService';
import { Vendor } from './entities/vendorEntity';
import { SparePart } from './entities/sparePartEntity';
import { LotItemType } from './entities/lotItemEntity';

async function main() {
  try {
    console.log('Initializing DataSource...');
    await Source.initialize();
    console.log('DataSource initialized.');

    const vendorRepo = Source.getRepository(Vendor);
    const sparePartRepo = Source.getRepository(SparePart);
    const lotRepo = new LotRepository();
    const lotService = new LotService();

    // 1. Get Dependencies
    const vendor = await vendorRepo.findOne({ where: {} });
    const sparePart = await sparePartRepo.findOne({ where: {} });

    if (!vendor || !sparePart) {
      console.error('Missing dependencies (Vendor or SparePart), skipping creation test.');
    } else {
      console.log(`Found Vendor: ${vendor.name}, Part: ${sparePart.part_name}`);

      // 2. Create Lot with Spare Part
      const timestamp = Date.now();
      const lotData = {
        vendorId: vendor.id,
        lotNumber: `DEBUG-LOT-${timestamp}`,
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: 'Debug Lot with Spare Part',
        items: [
          {
            itemType: LotItemType.SPARE_PART,
            sparePartId: sparePart.id,
            quantity: 5,
            unitPrice: 100,
          },
        ],
      };

      console.log('Creating Lot...');
      await lotService.createLot(lotData);
      console.log('Lot created.');
    }

    // 3. Fetch All
    console.log('Fetching all lots...');
    const lots = await lotRepo.getAllLots();
    console.log(`Fetched ${lots.length} lots successfully.`);

    // 4. Test Serialization
    console.log('Testing JSON serialization...');
    JSON.stringify(lots, null, 2);
    console.log('Serialization successful.');
    // console.log(json); // Optional
  } catch (error) {
    console.error('CRASHED:', error);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
    process.exit(0); // Force exit
  }
}

main();
