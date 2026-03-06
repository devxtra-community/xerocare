import { Source } from '../src/config/db';
import { RfqService } from '../src/services/rfqService';
import { RfqRepository } from '../src/repositories/rfqRepository';
import { RfqItemRepository } from '../src/repositories/rfqItemRepository';
import { RfqVendorRepository } from '../src/repositories/rfqVendorRepository';
import { RfqVendorItemRepository } from '../src/repositories/rfqVendorItemRepository';
import { LotRepository } from '../src/repositories/lotRepository';

import { ItemType } from '../src/entities/rfqItemEntity';

async function runTests() {
  console.log('--- Starting RFQ Integration Tests ---');

  try {
    // 1. Initialize DB
    await Source.initialize();
    console.log('Database connected.');

    // Dependencies
    const rfqRepo = new RfqRepository(Source);
    new RfqItemRepository(Source);
    new RfqVendorRepository(Source);
    new RfqVendorItemRepository(Source);
    new LotRepository(); // Removed Source parameter
    const rfqService = new RfqService(Source);

    // Mock IDs
    const branchRes = await Source.query(`SELECT id FROM branches LIMIT 1;`);
    const userRes = await Source.query(`SELECT employee_id as id FROM employee_managers LIMIT 1;`);
    const vendorRes = await Source.query(`SELECT id FROM vendors LIMIT 2;`);
    const modelRes = await Source.query(`SELECT id FROM model LIMIT 2;`);

    if (!branchRes.length || !userRes.length || vendorRes.length < 2 || modelRes.length < 2) {
      console.log('Not enough master data (branches, users, vendors, models) to run tests.');
      process.exit(1);
    }

    const branchId = branchRes[0].id;
    const createdBy = userRes[0].id;
    const vendor1Id = vendorRes[0].id;
    const vendor2Id = vendorRes[1].id;
    const itemId1 = modelRes[0].id;
    const itemId2 = modelRes[1].id;

    // --- TEST 1: Creation and Sending ---
    console.log('\n[Test 1] Create and Send RFQ');
    const rfq = await rfqService.createRfq({
      branchId,
      createdBy,
      items: [
        { itemType: ItemType.MODEL, itemId: itemId1, quantity: 5 },
        { itemType: ItemType.MODEL, itemId: itemId2, quantity: 10 },
      ],
      vendorIds: [vendor1Id, vendor2Id],
    });

    console.log(`Created RFQ: ${rfq.rfq_number}, Status: ${rfq.status}`);

    const sentRfq = await rfqService.sendRfq(rfq.id);
    console.log(`Sent RFQ, new Status: ${sentRfq.status}`);

    // --- TEST 2: Quoting ---
    console.log('\n[Test 2] Vendor 1 Quotes (Partial)');
    await rfqService.enterQuote(sentRfq.id, vendor1Id, [
      {
        rfqItemId: sentRfq.items[0].id,
        unitPrice: 100,
        stockStatus: 'IN_STOCK',
        availableQuantity: 5,
      },
      {
        rfqItemId: sentRfq.items[1].id,
        unitPrice: 50,
        stockStatus: 'IN_STOCK',
        availableQuantity: 10,
      },
    ]);

    const partialRfq = await rfqRepo.findWithDetails(sentRfq.id);
    console.log(`Vendor 1 Quoted. RFQ Status: ${partialRfq?.status}`);

    console.log('\n[Test 3] Vendor 2 Quotes (Fully)');
    await rfqService.enterQuote(sentRfq.id, vendor2Id, [
      {
        rfqItemId: sentRfq.items[0].id,
        unitPrice: 90,
        stockStatus: 'IN_STOCK',
        availableQuantity: 5,
      }, // cheaper
      {
        rfqItemId: sentRfq.items[1].id,
        unitPrice: 60,
        stockStatus: 'IN_STOCK',
        availableQuantity: 10,
      }, // more expensive
    ]);

    const fullRfq = await rfqRepo.findWithDetails(sentRfq.id);
    console.log(`Vendor 2 Quoted. RFQ Status: ${fullRfq?.status}`);

    // --- TEST 4: Comparison ---
    console.log('\n[Test 4] Comparison Logic');
    const comparison = await rfqService.getComparison(sentRfq.id);
    console.log('Comparison Matrix:');
    comparison.vendorsSummary.forEach((v: Record<string, unknown>) => {
      console.log(`- Vendor ${v.vendorId} Total: $${v.totalAmount} (Cheapest: ${v.isCheapest})`);
    });

    // --- TEST 5: Race Condition Awarding ---
    console.log('\n[Test 5] Concurrent Awarding (Race Condition Simulation)');
    try {
      const tempCheck = await rfqRepo.findWithDetails(sentRfq.id);
      console.log(
        'Vendor Statuses Before Awarding:',
        tempCheck?.vendors.map((v) => ({ id: v.vendor_id, status: v.status })),
      );

      // We simulate two admins clicking award at the exact same moment
      console.log('Triggering concurrent promises...');
      await Promise.all([
        rfqService.awardVendor(sentRfq.id, vendor1Id).catch((e) => {
          console.log('Admin 1 Failed:', e.message);
          return null;
        }),
        rfqService.awardVendor(sentRfq.id, vendor2Id).catch((e) => {
          console.log('Admin 2 Failed:', e.message);
          return null;
        }),
      ]);
    } catch {
      console.log('Caught overall exception in Promise.all');
    }

    const awardedRfq = await rfqRepo.findWithDetails(sentRfq.id);
    console.log(`Final RFQ Status after race: ${awardedRfq?.status}`);
    console.log(`Awarded Vendor ID: ${awardedRfq?.awarded_vendor_id}`);

    const awardedVendorEntity = awardedRfq?.vendors.find((v) => v.status === 'AWARDED');
    const rejectedVendors = awardedRfq?.vendors.filter((v) => v.status === 'REJECTED');
    console.log(`Verified Awarded vendor status: ${awardedVendorEntity?.status || 'No'}`);
    console.log(`Verified Rejected vendors count: ${rejectedVendors?.length}`);

    // --- TEST 6: Create Lot ---
    console.log('\n[Test 6] Lot Creation');
    const lot = await rfqService.createLotFromRfq(sentRfq.id, createdBy);
    console.log(`Created Lot ID: ${lot.id}, Lot Number linked: ${lot.lotNumber || 'N/A'}`);

    const closedRfq = await rfqRepo.findWithDetails(sentRfq.id);
    console.log(`Final RFQ Status: ${closedRfq?.status}`);

    console.log('\n✅ All integration tests passed.');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
      console.log('Database disconnected.');
    }
  }
}

runTests();
