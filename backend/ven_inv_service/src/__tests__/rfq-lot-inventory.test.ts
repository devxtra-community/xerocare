import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/db';
import { Vendor } from '../entities/vendorEntity';
import { Warehouse } from '../entities/warehouseEntity';
import { Branch } from '../entities/branchEntity';
import { EmployeeManager } from '../entities/employeeManagerEntity';
import { Rfq, RfqStatus } from '../entities/rfqEntity';
import { RfqVendorStatus } from '../entities/rfqVendorEntity';
import { LotStatus } from '../entities/lotEntity';
import { LotItem } from '../entities/lotItemEntity';
import { SparePart } from '../entities/sparePartEntity';

/**
 * Real RFQ -> award -> lot -> receive -> confirm -> add-to-inventory flow, against actual
 * routes/services (rfqController/rfqService/lotController/lotService/sparePartService) —
 * the fictional helper names from an earlier draft of this suite (createRFQ, awardRFQ,
 * receiveLot, useSparePartInServiceTicket) don't exist; see each step's comment for the
 * real name.
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
const TEST_BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const TEST_USER_ID = '33333333-3333-4333-8333-333333333333';

let uniqueCounter = 0;
function unique(label: string) {
  uniqueCounter += 1;
  return `${label}-${Date.now()}-${uniqueCounter}`;
}

function adminToken() {
  return jwt.sign(
    { userId: TEST_USER_ID, role: 'ADMIN', branchId: TEST_BRANCH_ID, email: 'admin@xerocare.test' },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

async function createVendor() {
  const repo = Source.getRepository(Vendor);
  return repo.save(repo.create({ name: unique('Vendor'), email: `${unique('vendor')}@test.com` }));
}

async function createWarehouse() {
  const repo = Source.getRepository(Warehouse);
  return repo.save(
    repo.create({
      warehouseName: unique('Warehouse'),
      warehouseCode: unique('WH'),
      branchId: TEST_BRANCH_ID,
    }),
  );
}

beforeAll(async () => {
  await connectWithRetry();
  await Source.getRepository(Branch).save(
    Source.getRepository(Branch).create({
      id: TEST_BRANCH_ID,
      name: 'Test Branch',
      address: 'Test Address',
      location: 'Test Location',
      started_date: new Date('2020-01-01'),
    }),
  );
  // rfqs.created_by has a real FK to employee_managers(employee_id) — a local mirror of
  // employee_service's employee rows, normally kept in sync by employeeConsumer.ts
  // (consuming employee.* events — not branchConsumer.ts, which is the OTHER direction:
  // ven_inv_service publishes branch.* and employee_service consumes it, see Phase 4's
  // branch-sync test). Nothing populates it in an isolated test run here, so it needs a
  // fixture row directly.
  await Source.getRepository(EmployeeManager).save(
    Source.getRepository(EmployeeManager).create({
      employee_id: TEST_USER_ID,
      email: 'creator@xerocare.test',
      status: 'ACTIVE',
    }),
  );
}, 60000);

afterAll(async () => {
  await Source.destroy();
});

describe('RFQ -> award -> lot -> receive -> confirm -> add-to-inventory (spare part)', () => {
  test('complete purchase flow moves a lot from PENDING to RECEIVED and creates spare part stock', async () => {
    const vendor = await createVendor();
    const warehouse = await createWarehouse();
    const token = adminToken();
    const partName = unique('Toner Cartridge');

    // Step 1: create RFQ — real route POST /rfq/, real controller RfqController.createRfq
    const createRes = await request(app)
      .post('/rfq/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          {
            itemType: 'SPARE_PART',
            customBrandName: 'Test Brand',
            customSparePartName: partName,
            quantity: 10,
          },
        ],
        vendorIds: [vendor.id],
      });
    expect(createRes.status).toBe(201);
    const rfq = createRes.body.data;
    expect(rfq.rfq_number).toBeDefined();
    const rfqItemId = rfq.items[0].id;

    const stored = await Source.getRepository(Rfq).findOne({ where: { id: rfq.id } });
    expect(stored?.status).toBe(RfqStatus.DRAFT);

    // Step 2: send RFQ to vendor(s) — real route POST /rfq/:id/send
    const sendRes = await request(app)
      .post(`/rfq/${rfq.id}/send`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.data.status).toBe(RfqStatus.SENT);

    // Step 3: vendor quote entered manually — real route POST /rfq/:id/quote/manual
    const quoteRes = await request(app)
      .post(`/rfq/${rfq.id}/quote/manual`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        vendorId: vendor.id,
        quotes: [
          {
            rfqItemId,
            unitPrice: 50,
            stockStatus: 'IN_STOCK',
            availableQuantity: 10,
          },
        ],
      });
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.data.status).toBe(RfqVendorStatus.QUOTED);

    // With a single invited vendor, one quote is "all vendors quoted" -> FULLY_QUOTED.
    const afterQuote = await Source.getRepository(Rfq).findOne({ where: { id: rfq.id } });
    expect(afterQuote?.status).toBe(RfqStatus.FULLY_QUOTED);

    // Step 4: award the vendor — real route POST /rfq/:id/award/:vendorId,
    // RfqService.awardVendor (not "awardRFQ")
    const awardRes = await request(app)
      .post(`/rfq/${rfq.id}/award/${vendor.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ warehouseId: warehouse.id });
    expect(awardRes.status).toBe(200);
    expect(awardRes.body.rfq.status).toBe(RfqStatus.AWARDED);

    // Step 5: create the lot from the awarded RFQ — real route POST /rfq/:id/create-lot,
    // RfqService.createLotFromRfq. Awarding does NOT itself create a lot — this is a
    // separate, explicit step.
    const lotRes = await request(app)
      .post(`/rfq/${rfq.id}/create-lot`)
      .set('Authorization', `Bearer ${token}`)
      .send({ warehouseId: warehouse.id });
    expect(lotRes.status).toBe(200);
    const lot = lotRes.body.data;
    expect(lot.status).toBe(LotStatus.PENDING);

    const lotItem = await Source.getRepository(LotItem).findOne({ where: { lotId: lot.id } });
    expect(lotItem).toBeDefined();
    expect(lotItem?.expectedQuantity).toBe(10);

    // Step 6: receive quantities — real route PATCH /lots/:id/receive,
    // LotRepository.updateReceivingQuantities. There is no PARTIALLY_RECEIVED status —
    // partial receipt is modeled as status RECEIVING + per-item received/damaged fields.
    const receiveRes = await request(app)
      .patch(`/lots/${lot.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ item_id: lotItem!.id, received_quantity: 10, damaged_quantity: 0 }],
      });
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe(LotStatus.RECEIVING);

    // Step 7: confirm receipt — real route POST /lots/:id/confirm,
    // LotRepository.confirmLotReceived. This unlocks inventory creation.
    const confirmRes = await request(app)
      .post(`/lots/${lot.id}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe(LotStatus.RECEIVED);

    // Step 8: add to inventory — real route POST /spare-parts/add,
    // SparePartService.addSingleSparePart (not "useSparePartInServiceTicket" — that
    // fictional name doesn't exist; adding stock and consuming it in a service ticket are
    // two separate, unrelated code paths). mpn is a real required field on this endpoint.
    const addRes = await request(app)
      .post('/spare-parts/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId: TEST_BRANCH_ID,
        part_name: partName,
        brand: 'Test Brand',
        mpn: unique('MPN'),
        lot_id: lot.id,
        warehouse_id: warehouse.id,
        quantity: 10,
      });
    expect(addRes.status).toBe(201);

    const stockedPart = await Source.getRepository(SparePart).findOne({
      where: { part_name: partName },
    });
    expect(stockedPart).toBeDefined();
    expect(stockedPart?.quantity).toBe(10);

    // The lot item's usedQuantity is tracked by LotRepository.validateAndTrackUsage —
    // confirms the "add to inventory" step is actually linked back to what was received,
    // not just creating an unrelated spare part row with the same name.
    const updatedLotItem = await Source.getRepository(LotItem).findOne({
      where: { id: lotItem!.id },
    });
    expect(updatedLotItem?.usedQuantity).toBe(10);
  });

  test('cannot add lot spare parts to inventory before the lot is confirmed received', async () => {
    const vendor = await createVendor();
    const warehouse = await createWarehouse();
    const token = adminToken();
    const partName = unique('Unreceived Part');

    const createRes = await request(app)
      .post('/rfq/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          {
            itemType: 'SPARE_PART',
            customBrandName: 'Test Brand',
            customSparePartName: partName,
            quantity: 5,
          },
        ],
        vendorIds: [vendor.id],
      });
    const rfq = createRes.body.data;
    const rfqItemId = rfq.items[0].id;

    await request(app).post(`/rfq/${rfq.id}/send`).set('Authorization', `Bearer ${token}`).send();
    await request(app)
      .post(`/rfq/${rfq.id}/quote/manual`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        vendorId: vendor.id,
        quotes: [{ rfqItemId, unitPrice: 20, stockStatus: 'IN_STOCK', availableQuantity: 5 }],
      });
    await request(app)
      .post(`/rfq/${rfq.id}/award/${vendor.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ warehouseId: warehouse.id });
    const lotRes = await request(app)
      .post(`/rfq/${rfq.id}/create-lot`)
      .set('Authorization', `Bearer ${token}`)
      .send({ warehouseId: warehouse.id });
    const lot = lotRes.body.data;

    // Lot is still PENDING — never received or confirmed.
    const addRes = await request(app)
      .post('/spare-parts/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        branchId: TEST_BRANCH_ID,
        part_name: partName,
        brand: 'Test Brand',
        mpn: unique('MPN'),
        lot_id: lot.id,
        warehouse_id: warehouse.id,
        quantity: 5,
      });
    expect(addRes.status).toBe(400);
    expect(addRes.body.message).toContain('lot is received');

    const part = await Source.getRepository(SparePart).findOne({ where: { part_name: partName } });
    expect(part).toBeNull();
  });

  test('awarding a vendor before the RFQ is fully quoted is rejected', async () => {
    const vendor = await createVendor();
    const warehouse = await createWarehouse();
    const token = adminToken();

    const createRes = await request(app)
      .post('/rfq/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          {
            itemType: 'SPARE_PART',
            customBrandName: 'Test Brand',
            customSparePartName: unique('Part'),
            quantity: 1,
          },
        ],
        vendorIds: [vendor.id],
      });
    const rfq = createRes.body.data;
    await request(app).post(`/rfq/${rfq.id}/send`).set('Authorization', `Bearer ${token}`).send();

    // No quote entered yet — RFQ is SENT, not FULLY_QUOTED.
    const awardRes = await request(app)
      .post(`/rfq/${rfq.id}/award/${vendor.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ warehouseId: warehouse.id });
    expect(awardRes.status).toBe(400);
  });
});
