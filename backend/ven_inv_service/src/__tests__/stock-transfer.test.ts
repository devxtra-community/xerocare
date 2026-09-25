import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/db';
import { Branch } from '../entities/branchEntity';
import { Warehouse } from '../entities/warehouseEntity';
import { SparePart } from '../entities/sparePartEntity';
import { Model } from '../entities/modelEntity';
import { Product, ProductStatus } from '../entities/productEntity';
import { TransferStatus } from '../entities/stockTransferEntity';

/**
 * Real stock-transfer flows against actual routes/StockTransferService — real names
 * confirmed against source, not the task's fictional "createStockTransfer": creation is
 * `StockTransferService.createDraft`. Real facts that diverge from a naive reading of the
 * task:
 * - There is NO separate "receive" route on /stock-transfers. Completion happens through
 *   the SAME Lot-based receiving flow already used for RFQ purchases: dispatching a
 *   transfer creates (INTRA) or already created at approval (INTER) a real Lot row
 *   (transferOrigin: true), and POST /lots/:id/confirm is what actually finishes the
 *   transfer (StockTransferService.completeFromLot runs inside the same DB transaction as
 *   confirmLotReceived).
 * - INTRA_BRANCH transfers skip submit/approve entirely — DRAFT -> dispatch -> IN_TRANSIT
 *   -> lot confirm -> COMPLETED. Calling submit/approve on an INTRA transfer is rejected
 *   ("Only inter-branch requests are submitted/need approval").
 * - INTER_BRANCH spare-part lines reserve at APPROVE time (reserved_quantity increments,
 *   quantity does NOT drop yet) and only actually decrement `quantity` at DISPATCH.
 *   INTRA spare-part lines have no reservation step at all — dispatch decrements `quantity`
 *   directly.
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
const BRANCH_A = 'aaaaaaaa-1111-4111-8111-111111111111';
const BRANCH_B = 'bbbbbbbb-2222-4222-8222-222222222222';

let uniqueCounter = 0;
function unique(label: string) {
  uniqueCounter += 1;
  return `${label}-${Date.now()}-${uniqueCounter}`;
}

function adminToken() {
  return jwt.sign(
    { userId: 'cccccccc-3333-4333-8333-333333333333', role: 'ADMIN', email: 'admin@xerocare.test' },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

async function createBranch(id: string) {
  const repo = Source.getRepository(Branch);
  return repo.save(
    repo.create({
      id,
      name: unique('Branch'),
      address: 'Test Address',
      location: 'Test Location',
      started_date: new Date('2020-01-01'),
    }),
  );
}

async function createWarehouse(branchId: string) {
  const repo = Source.getRepository(Warehouse);
  return repo.save(
    repo.create({ warehouseName: unique('Warehouse'), warehouseCode: unique('WH'), branchId }),
  );
}

async function createSparePart(branchId: string, warehouseId: string, quantity: number) {
  const repo = Source.getRepository(SparePart);
  return repo.save(
    repo.create({
      sku: unique('SKU'),
      part_name: unique('Drum Unit'),
      brand: 'Test Brand',
      branch_id: branchId,
      warehouse_id: warehouseId,
      quantity,
    }),
  );
}

async function createModel() {
  const repo = Source.getRepository(Model);
  return repo.save(repo.create({ model_no: unique('MODEL'), model_name: unique('Model Name') }));
}

async function createProduct(modelId: string, warehouseId: string) {
  const repo = Source.getRepository(Product);
  return repo.save(
    repo.create({
      serial_no: unique('SN'),
      name: 'Test Printer',
      brand: 'Test Brand',
      tax_rate: 0,
      model_id: modelId,
      warehouse_id: warehouseId,
      product_status: ProductStatus.AVAILABLE,
    }),
  );
}

function confirmTransferLot(token: string, lotId: string) {
  // Unlike the RFQ purchase flow (a prior phase), a transfer lot does not need
  // PATCH /lots/:id/receive first — POST /lots/:id/confirm alone is enough to trigger
  // confirmLotReceived -> completeFromLot in one transaction.
  return request(app).post(`/lots/${lotId}/confirm`).set('Authorization', `Bearer ${token}`).send();
}

beforeAll(async () => {
  await connectWithRetry();
  await createBranch(BRANCH_A);
  await createBranch(BRANCH_B);
}, 60000);

afterAll(async () => {
  await Source.destroy();
});

describe('INTRA_BRANCH transfer (warehouse -> warehouse, same branch)', () => {
  test('DRAFT -> dispatch -> lot confirm -> COMPLETED, moving spare-part stock between warehouses', async () => {
    const token = adminToken();
    const whSource = await createWarehouse(BRANCH_A);
    const whDest = await createWarehouse(BRANCH_A);
    const part = await createSparePart(BRANCH_A, whSource.id, 10);

    const createRes = await request(app)
      .post('/stock-transfers/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transfer_type: 'INTRA_BRANCH',
        source_branch_id: BRANCH_A,
        source_warehouse_id: whSource.id,
        destination_branch_id: BRANCH_A,
        destination_warehouse_id: whDest.id,
        reason: 'Rebalance stock',
        items: [{ item_type: 'SPARE_PART', spare_part_id: part.id, requested_qty: 4 }],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe(TransferStatus.DRAFT);
    const transferId = createRes.body.data.id;

    // INTRA transfers cannot be submitted or approved — they go straight to dispatch.
    const submitRes = await request(app)
      .post(`/stock-transfers/${transferId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(submitRes.status).toBe(400);

    const dispatchRes = await request(app)
      .post(`/stock-transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.status).toBe(TransferStatus.IN_TRANSIT);
    const lotId = dispatchRes.body.data.lot_id;
    expect(lotId).toBeDefined();

    // Dispatch decrements source quantity immediately for INTRA (no reservation step).
    let sourcePart = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(sourcePart?.quantity).toBe(6);

    const confirmRes = await confirmTransferLot(token, lotId);
    expect(confirmRes.status).toBe(200);

    const finalTransfer = await request(app)
      .get(`/stock-transfers/${transferId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(finalTransfer.body.data.status).toBe(TransferStatus.COMPLETED);

    sourcePart = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(sourcePart?.quantity).toBe(6); // unchanged since dispatch

    const destPart = await Source.getRepository(SparePart).findOne({
      where: { part_name: part.part_name, warehouse_id: whDest.id },
    });
    expect(destPart).toBeDefined();
    expect(destPart?.quantity).toBe(4);
  });
});

describe('INTER_BRANCH transfer (branch -> branch, full request/approve chain)', () => {
  test('DRAFT -> submit -> approve -> dispatch -> lot confirm -> COMPLETED', async () => {
    const token = adminToken();
    const whSource = await createWarehouse(BRANCH_A);
    const whDest = await createWarehouse(BRANCH_B);
    const part = await createSparePart(BRANCH_A, whSource.id, 10);

    const createRes = await request(app)
      .post('/stock-transfers/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transfer_type: 'INTER_BRANCH',
        source_branch_id: BRANCH_A,
        destination_branch_id: BRANCH_B,
        destination_warehouse_id: whDest.id,
        reason: 'Branch B needs stock',
        items: [{ item_type: 'SPARE_PART', spare_part_id: part.id, requested_qty: 5 }],
      });
    expect(createRes.status).toBe(201);
    const transferId = createRes.body.data.id;
    const itemId = createRes.body.data.items[0].id;

    const submitRes = await request(app)
      .post(`/stock-transfers/${transferId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe(TransferStatus.SENT);

    const approveRes = await request(app)
      .post(`/stock-transfers/${transferId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ item_id: itemId, approved_qty: 5 }] });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe(TransferStatus.APPROVED);
    const lotId = approveRes.body.data.lot_id;
    expect(lotId).toBeDefined();

    // Approval RESERVES (reserved_quantity up) but does not yet decrement quantity.
    let sourcePart = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(sourcePart?.quantity).toBe(10);
    expect(sourcePart?.reserved_quantity).toBe(5);

    const dispatchRes = await request(app)
      .post(`/stock-transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.status).toBe(TransferStatus.IN_TRANSIT);

    // Dispatch converts the reservation into a real decrement.
    sourcePart = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(sourcePart?.quantity).toBe(5);
    expect(sourcePart?.reserved_quantity).toBe(0);

    const confirmRes = await confirmTransferLot(token, lotId);
    expect(confirmRes.status).toBe(200);

    const finalTransfer = await request(app)
      .get(`/stock-transfers/${transferId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(finalTransfer.body.data.status).toBe(TransferStatus.COMPLETED);

    const destPart = await Source.getRepository(SparePart).findOne({
      where: { part_name: part.part_name, warehouse_id: whDest.id },
    });
    expect(destPart?.quantity).toBe(5);
  });

  test('rejects a transfer request with a reason, without ever touching stock', async () => {
    const token = adminToken();
    const whSource = await createWarehouse(BRANCH_A);
    const whDest = await createWarehouse(BRANCH_B);
    const part = await createSparePart(BRANCH_A, whSource.id, 10);

    const createRes = await request(app)
      .post('/stock-transfers/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transfer_type: 'INTER_BRANCH',
        source_branch_id: BRANCH_A,
        destination_branch_id: BRANCH_B,
        destination_warehouse_id: whDest.id,
        reason: 'Testing rejection',
        items: [{ item_type: 'SPARE_PART', spare_part_id: part.id, requested_qty: 5 }],
      });
    const transferId = createRes.body.data.id;
    await request(app)
      .post(`/stock-transfers/${transferId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    const rejectRes = await request(app)
      .post(`/stock-transfers/${transferId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Not enough stock to spare' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe(TransferStatus.REJECTED);

    const stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(10);
    expect(stock?.reserved_quantity).toBe(0);
  });
});

describe('Active-lease block', () => {
  test('an INTRA_BRANCH transfer of a machine on active lease is rejected', async () => {
    const token = adminToken();
    const whSource = await createWarehouse(BRANCH_A);
    const whDest = await createWarehouse(BRANCH_A);
    const model = await createModel();
    const product = await createProduct(model.id, whSource.id);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ contractStatus: 'ACTIVE', customerName: 'Test Customer' }),
    } as Response);

    const res = await request(app)
      .post('/stock-transfers/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transfer_type: 'INTRA_BRANCH',
        source_branch_id: BRANCH_A,
        source_warehouse_id: whSource.id,
        destination_branch_id: BRANCH_A,
        destination_warehouse_id: whDest.id,
        reason: 'Attempted transfer of leased machine',
        items: [{ item_type: 'PRODUCT', product_id: product.id, requested_qty: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('currently on active lease');

    fetchSpy.mockRestore();
  });
});
