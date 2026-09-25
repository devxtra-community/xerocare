import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/db';
import { Branch } from '../entities/branchEntity';
import { SparePart } from '../entities/sparePartEntity';
import { InventoryReservation } from '../entities/inventoryReservationEntity';
import { ServiceTicketStatus } from '../entities/serviceTicketEntity';

/**
 * Full service ticket completion chain: estimate -> submit -> finance-approve ->
 * customer-approve -> complete, against real routes/serviceController.ts. Real-code facts
 * that diverge from the original task's assumptions (confirmed by reading the code, not
 * guessed):
 * - Spare-part stock is reserved at CUSTOMER approval, never at finance approval — the
 *   "(or finance, for FOC-only estimates)" clause in diagnoseTicket's own code comment does
 *   not match approveEstimateFinance's actual implementation (it never calls
 *   reserveSparePart). Reservation happens in applyCustomerEstimateApproval, called by
 *   approveEstimateCustomer.
 * - Reservation immediately decrements `quantity` (moving it into `reserved_quantity`) —
 *   `quantity` is NOT held back until completion.
 * - Completion (`consumeReservations`) does not touch `quantity` again — it only moves
 *   reserved_quantity -> consumed_quantity. Net effect across the lifecycle: quantity drops
 *   once, at customer-approval, not at completion.
 * - Rejecting an estimate (finance or customer) never calls releaseReservations, because
 *   nothing has been reserved yet at that point in the chain — release only exists for
 *   cancelling an ALREADY customer-approved (already-reserved) ticket.
 * - approveEstimateCustomer requires a customer signature in the body
 *   (signatureData/signedDocumentUrl) unless confirmedVia is REMOTE_LINK.
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
const TEST_BRANCH_ID = '88888888-8888-4888-8888-888888888888';

let uniqueCounter = 0;
function unique(label: string) {
  uniqueCounter += 1;
  return `${label}-${Date.now()}-${uniqueCounter}`;
}

function signToken(overrides: Partial<{ userId: string; role: string }> = {}) {
  return jwt.sign(
    {
      userId: '77777777-7777-4777-8777-777777777777',
      role: 'MANAGER', // MANAGER/ADMIN bypass every role gate in this chain, per explorer report
      branchId: TEST_BRANCH_ID,
      email: 'manager@xerocare.test',
      ...overrides,
    },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

async function createSparePart(quantity: number) {
  const repo = Source.getRepository(SparePart);
  return repo.save(
    repo.create({
      sku: unique('SKU'),
      part_name: unique('Toner'),
      brand: 'Test Brand',
      branch_id: TEST_BRANCH_ID,
      quantity,
    }),
  );
}

async function createTicket(token: string) {
  const res = await request(app)
    .post('/service/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      serialNumber: unique('SERIAL'),
      issueDescription: 'Paper jam',
      productBrand: 'Test Brand',
      productModel: 'Test Model',
      productName: 'Test Printer',
    });
  return res.body.data;
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
}, 60000);

afterAll(async () => {
  await Source.destroy();
});

describe('Estimate -> finance approval -> customer approval -> completion', () => {
  test('reserves stock at customer approval (not finance approval), then consumes it at completion', async () => {
    const token = signToken();
    const part = await createSparePart(10);
    const ticket = await createTicket(token);

    // Step 1: create a DRAFT estimate with a spare-part line item.
    const estimateRes = await request(app)
      .post(`/service/tickets/${ticket.id}/estimates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ labourCost: 100, items: [{ sparePartId: part.id, quantity: 3 }] });
    expect(estimateRes.status).toBe(200); // createEstimate returns 200, not 201
    const estimateId = estimateRes.body.data.id;

    // Nothing reserved yet at DRAFT.
    let stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(10);
    expect(stock?.reserved_quantity).toBe(0);

    // Step 2: submit for finance approval.
    const submitRes = await request(app)
      .post(`/service/tickets/${ticket.id}/estimates/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(submitRes.status).toBe(200);

    // Step 3: finance approves — real code does NOT reserve here.
    const financeRes = await request(app)
      .post(`/service/estimates/${estimateId}/approve-finance`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(financeRes.status).toBe(200);

    stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(10); // still untouched after finance approval
    expect(stock?.reserved_quantity).toBe(0);

    // Step 4: customer approves — THIS is what reserves.
    const customerRes = await request(app)
      .post(`/service/estimates/${estimateId}/approve-customer`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        confirmedVia: 'IN_PERSON',
        customerName: 'Test Customer',
        signatureData: 'data:image/png;base64,aaaa',
      });
    expect(customerRes.status).toBe(200);

    stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(7); // 10 - 3, decremented immediately at reservation
    expect(stock?.reserved_quantity).toBe(3);
    expect(stock?.consumed_quantity).toBe(0);

    const reservation = await Source.getRepository(InventoryReservation).findOne({
      where: { ticketId: ticket.id, sparePartId: part.id },
    });
    expect(reservation?.status).toBe('RESERVED');
    expect(reservation?.reservedQuantity).toBe(3);

    // Step 5: complete the ticket — moves reserved -> consumed, quantity untouched again.
    const completeRes = await request(app)
      .post(`/service/tickets/${ticket.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      // workPerformed is a real NOT NULL column on service_reports — completeService's own
      // body validation doesn't reject its absence, but the INSERT does.
      .send({ workPerformed: 'Replaced toner cartridge', resolutionDetails: 'Replaced part' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe(ServiceTicketStatus.COMPLETED);

    stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(7); // unchanged by completion
    expect(stock?.reserved_quantity).toBe(0);
    expect(stock?.consumed_quantity).toBe(3);

    const finalReservation = await Source.getRepository(InventoryReservation).findOne({
      where: { ticketId: ticket.id, sparePartId: part.id },
    });
    expect(finalReservation?.status).toBe('CONSUMED');
  });

  test('reserving more than available stock is rejected, and nothing is decremented', async () => {
    const token = signToken();
    const part = await createSparePart(2);
    const ticket = await createTicket(token);

    const estimateRes = await request(app)
      .post(`/service/tickets/${ticket.id}/estimates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ sparePartId: part.id, quantity: 5 }] });
    const estimateId = estimateRes.body.data.id;

    await request(app)
      .post(`/service/tickets/${ticket.id}/estimates/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    await request(app)
      .post(`/service/estimates/${estimateId}/approve-finance`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    const customerRes = await request(app)
      .post(`/service/estimates/${estimateId}/approve-customer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmedVia: 'IN_PERSON', signatureData: 'sig' });
    // reserveSparePart throws a plain Error (not AppError) on insufficient stock — the
    // generic error handler maps that to 500, not 400.
    expect(customerRes.status).toBe(500);

    const stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(2); // unchanged
    expect(stock?.reserved_quantity).toBe(0);
  });

  test('finance rejection never reserved anything, so there is nothing to release', async () => {
    const token = signToken();
    const part = await createSparePart(10);
    const ticket = await createTicket(token);

    const estimateRes = await request(app)
      .post(`/service/tickets/${ticket.id}/estimates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ sparePartId: part.id, quantity: 4 }] });
    const estimateId = estimateRes.body.data.id;

    await request(app)
      .post(`/service/tickets/${ticket.id}/estimates/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    const rejectRes = await request(app)
      .post(`/service/estimates/${estimateId}/reject-finance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ remarks: 'Too expensive' });
    expect(rejectRes.status).toBe(200);

    const stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(10);
    expect(stock?.reserved_quantity).toBe(0);
  });

  // KNOWN GAP, confirmed by reading roleMiddleware.ts directly: POST /tickets/:id/cancel is
  // gated with `requireServiceRole([], false)` (serviceRoutes.ts:155). The inline comment
  // there says "Only ADMIN and MANAGER", but requireServiceRole's ADMIN/MANAGER bypass is
  // itself gated on its second parameter (`allowManagerAdmin`, default true) — passing
  // `false` here DISABLES that bypass, and the empty `[]` allowedJobs means no EMPLOYEE/
  // Fixed: POST /tickets/:id/cancel was `requireServiceRole([], false)` — `false` disabled
  // the ADMIN/MANAGER bypass branch entirely, so the route rejected every caller including
  // ADMIN, contrary to its own "Only ADMIN and MANAGER" comment. Now `requireServiceRole([], true)`.
  test('ADMIN can cancel a ticket; a plain EMPLOYEE cannot', async () => {
    const managerToken = signToken();
    const ticket = await createTicket(managerToken);

    const employeeToken = signToken({ role: 'EMPLOYEE' });
    const employeeRes = await request(app)
      .post(`/service/tickets/${ticket.id}/cancel`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send();
    expect(employeeRes.status).toBe(403);

    const adminToken = signToken({ role: 'ADMIN' });
    const adminRes = await request(app)
      .post(`/service/tickets/${ticket.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.status).toBe(ServiceTicketStatus.CANCELLED);
  });

  test('cancelling an already customer-approved ticket releases the reservation back to available stock', async () => {
    const token = signToken();
    const part = await createSparePart(10);
    const ticket = await createTicket(token);

    const estimateRes = await request(app)
      .post(`/service/tickets/${ticket.id}/estimates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ sparePartId: part.id, quantity: 4 }] });
    const estimateId = estimateRes.body.data.id;

    await request(app)
      .post(`/service/tickets/${ticket.id}/estimates/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    await request(app)
      .post(`/service/estimates/${estimateId}/approve-finance`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    await request(app)
      .post(`/service/estimates/${estimateId}/approve-customer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmedVia: 'IN_PERSON', signatureData: 'sig' });

    let stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(6); // 10 - 4 reserved

    const cancelRes = await request(app)
      .post(`/service/tickets/${ticket.id}/cancel`)
      .set('Authorization', `Bearer ${token}`) // MANAGER — now correctly allowed
      .send();
    expect(cancelRes.status).toBe(200);

    stock = await Source.getRepository(SparePart).findOne({ where: { id: part.id } });
    expect(stock?.quantity).toBe(10); // released back
    expect(stock?.reserved_quantity).toBe(0);

    const reservation = await Source.getRepository(InventoryReservation).findOne({
      where: { ticketId: ticket.id, sparePartId: part.id },
    });
    expect(reservation?.status).toBe('RELEASED');
  });
});
