import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/db';
import { Branch } from '../entities/branchEntity';
import { ServiceTicketStatus, ServiceContext } from '../entities/serviceTicketEntity';

/**
 * Real service ticket lifecycle against actual routes (serviceController.createTicket /
 * assignTechnician / diagnoseTicket). Scoped to create -> assign -> diagnose: the further
 * steps (estimate -> finance approval -> customer approval -> complete) are a materially
 * deeper chain (ServiceEstimate entities, signing tokens, spare-part reservation happens at
 * estimate-approval time, not at diagnose) — left for a later pass rather than guessed at.
 *
 * A ticket for a serial number with no matching Product row takes the simplest real code
 * path (determineServiceContextAndJobType's `if (product)` branch never runs), which avoids
 * needing Model/Product/Warehouse fixtures and the cross-service billing_context HTTP call
 * just to prove the ticket lifecycle itself.
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
const TEST_BRANCH_ID = '44444444-4444-4444-8444-444444444444';
const TEST_TECHNICIAN_ID = '55555555-5555-4555-8555-555555555555';

let uniqueCounter = 0;
function unique(label: string) {
  uniqueCounter += 1;
  return `${label}-${Date.now()}-${uniqueCounter}`;
}

function signToken(
  overrides: Partial<{ userId: string; role: string; employeeJob: string | null }> = {},
) {
  return jwt.sign(
    {
      userId: '66666666-6666-4666-8666-666666666666',
      role: 'MANAGER',
      branchId: TEST_BRANCH_ID,
      email: 'manager@xerocare.test',
      employeeJob: null,
      ...overrides,
    },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

async function createTicket(token: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/service/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      serialNumber: unique('SERIAL'),
      issueDescription: 'Paper jam',
      // productBrand/productModel/productName are NOT NULL on service_tickets even for a
      // machine with no matching Product row — staff type these in manually for walk-ins.
      productBrand: 'Test Brand',
      productModel: 'Test Model',
      productName: 'Test Printer',
      ...overrides,
    });
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

describe('Service ticket lifecycle (create -> assign -> diagnose)', () => {
  test('creates a ticket for an unregistered machine as OPEN/CHARGEABLE', async () => {
    const token = signToken();
    const res = await createTicket(token);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(ServiceTicketStatus.OPEN);
    // No Product row matches this serial, so determineServiceContextAndJobType's whole
    // rent/warranty/lease branch is skipped and the default applies.
    expect(res.body.data.serviceContext).toBe(ServiceContext.CHARGEABLE);
    expect(res.body.data.productId).toBeNull();
  });

  test('rejects a second open ticket for the same serial number', async () => {
    const token = signToken();
    const serialNumber = unique('SERIAL');
    const first = await createTicket(token, { serialNumber });
    expect(first.status).toBe(201);

    const second = await createTicket(token, { serialNumber });
    expect(second.status).toBe(400);
    expect(second.body.message).toContain('already has an open service ticket');
  });

  test('MANAGER can assign a technician, moving the ticket to ASSIGNED', async () => {
    const managerToken = signToken({ role: 'MANAGER' });
    const created = await createTicket(managerToken);
    const ticketId = created.body.data.id;

    const res = await request(app)
      .post(`/service/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ assignedTechnicianId: TEST_TECHNICIAN_ID });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ServiceTicketStatus.ASSIGNED);
    expect(res.body.data.assignedTechnicianId).toBe(TEST_TECHNICIAN_ID);
  });

  test('plain EMPLOYEE cannot assign a technician (manager/admin/service-help-desk only)', async () => {
    const managerToken = signToken({ role: 'MANAGER' });
    const created = await createTicket(managerToken);
    const ticketId = created.body.data.id;

    const employeeToken = signToken({ role: 'EMPLOYEE', employeeJob: 'SALES' });
    const res = await request(app)
      .post(`/service/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ assignedTechnicianId: TEST_TECHNICIAN_ID });

    expect(res.status).toBe(403);
  });

  test('assigned technician can diagnose the ticket, moving it to WAITING_FINANCE_APPROVAL', async () => {
    const managerToken = signToken({ role: 'MANAGER' });
    const created = await createTicket(managerToken);
    const ticketId = created.body.data.id;

    await request(app)
      .post(`/service/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ assignedTechnicianId: TEST_TECHNICIAN_ID });

    const technicianToken = signToken({
      userId: TEST_TECHNICIAN_ID,
      role: 'EMPLOYEE',
      employeeJob: 'SERVICE_TECHNICIAN',
    });

    const res = await request(app)
      .post(`/service/tickets/${ticketId}/diagnose`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        problemFound: 'Worn feed roller',
        rootCause: 'End of life part',
        technicianNotes: 'Replaced roller',
        labourCost: 100,
      });

    expect(res.status).toBe(200);
    // Real code: every diagnosed ticket goes to WAITING_FINANCE_APPROVAL regardless of
    // service context — there is no separate "DIAGNOSED" resting state in the real flow,
    // even though that enum value exists.
    expect(res.body.data.status).toBe(ServiceTicketStatus.WAITING_FINANCE_APPROVAL);
  });

  test('a technician who is not assigned to the ticket cannot diagnose it', async () => {
    const managerToken = signToken({ role: 'MANAGER' });
    const created = await createTicket(managerToken);
    const ticketId = created.body.data.id;

    await request(app)
      .post(`/service/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ assignedTechnicianId: TEST_TECHNICIAN_ID });

    const otherTechnicianToken = signToken({
      userId: '77777777-7777-4777-8777-777777777777',
      role: 'EMPLOYEE',
      employeeJob: 'SERVICE_TECHNICIAN',
    });

    const res = await request(app)
      .post(`/service/tickets/${ticketId}/diagnose`)
      .set('Authorization', `Bearer ${otherTechnicianToken}`)
      .send({ problemFound: 'Should not be allowed' });

    expect(res.status).toBe(403);
  });
});
