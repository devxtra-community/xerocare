import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/datasource';
import { connectMongo } from '../config/mongo';
import { Customer } from '../entities/customerEntity';
import { LeadStatus } from '../models/leadModel';

/**
 * Real crm_service routes only. Two corrections to the original task's assumptions:
 * - `Lead` is a Mongoose model (its own `xerocare_test` Mongo DB), not a TypeORM/Postgres
 *   entity — `Customer` is the only Postgres entity here. Both connections are needed.
 * - There is no single "customer 360 profile" endpoint. It's genuinely two separate calls
 *   (the route's own comment on GET /leads/by-customer/:customerId literally says
 *   "Customer 360° profile") — GET /customers/:id for the customer record, plus
 *   GET /leads/by-customer/:customerId for the one lead (if any) that originated it.
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;

let uniqueCounter = 0;
function unique(label: string) {
  uniqueCounter += 1;
  return `${label}-${Date.now()}-${uniqueCounter}`;
}

function adminToken() {
  // Customer.createdBy is a real `uuid` column — a non-UUID userId fails the insert.
  return jwt.sign(
    { userId: '88888888-8888-4888-8888-888888888888', role: 'ADMIN', email: 'admin@xerocare.test' },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

beforeAll(async () => {
  await connectWithRetry();
  await connectMongo();
}, 60000);

afterAll(async () => {
  await mongoose.connection.close();
  await Source.destroy();
});

describe('Lead creation (POST /leads)', () => {
  test('creates a lead with just a name, defaulting status to NEW', async () => {
    const res = await request(app)
      .post('/leads')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: unique('Lead') });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(LeadStatus.NEW);
    expect(res.body.data.isCustomer).toBe(false);
  });

  test('rejects a lead with no name', async () => {
    const res = await request(app)
      .post('/leads')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('Lead -> customer conversion (POST /leads/:id/convert)', () => {
  test('requires location before a lead can convert (the Lead schema itself does not require it)', async () => {
    const token = adminToken();
    const createRes = await request(app)
      .post('/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: unique('Lead') }); // no location
    const leadId = createRes.body.data._id;

    const convertRes = await request(app)
      .post(`/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(convertRes.status).toBe(400);
    expect(convertRes.body.message).toContain('Location is required');
  });

  test('converts a lead into a real Customer row and flips the lead to CONVERTED', async () => {
    const token = adminToken();
    const leadName = unique('Lead');
    const createRes = await request(app)
      .post('/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: leadName, email: `${unique('lead')}@test.com` });
    const leadId = createRes.body.data._id;

    const convertRes = await request(app)
      .post(`/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'Doha, Qatar' });

    expect(convertRes.status).toBe(200);
    const customerId = convertRes.body.data.customerId;
    expect(customerId).toBeDefined();

    const customer = await Source.getRepository(Customer).findOne({ where: { id: customerId } });
    expect(customer?.name).toBe(leadName);
    expect(customer?.location).toBe('Doha, Qatar');

    const leadRes = await request(app)
      .get(`/leads/${leadId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(leadRes.body.data.status).toBe(LeadStatus.CONVERTED);
    expect(leadRes.body.data.isCustomer).toBe(true);
    expect(leadRes.body.data.customerId).toBe(customerId);
  });

  test('converting an already-converted lead is idempotent — returns the same customerId, creates no second customer', async () => {
    const token = adminToken();
    const createRes = await request(app)
      .post('/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: unique('Lead') });
    const leadId = createRes.body.data._id;

    const first = await request(app)
      .post(`/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'Doha, Qatar' });
    const second = await request(app)
      .post(`/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'Doha, Qatar' });

    expect(second.status).toBe(200);
    expect(second.body.data.customerId).toBe(first.body.data.customerId);
  });
});

describe('Customer profile — two separate real calls, not one combined endpoint', () => {
  test('GET /customers/:id plus GET /leads/by-customer/:customerId together form the profile view', async () => {
    const token = adminToken();
    const leadName = unique('Lead');
    const createRes = await request(app)
      .post('/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: leadName });
    const leadId = createRes.body.data._id;

    const convertRes = await request(app)
      .post(`/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'Doha, Qatar' });
    const customerId = convertRes.body.data.customerId;

    const customerRes = await request(app)
      .get(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(customerRes.status).toBe(200);
    expect(customerRes.body.data.name).toBe(leadName);

    const leadByCustomerRes = await request(app)
      .get(`/leads/by-customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(leadByCustomerRes.status).toBe(200);
    expect(leadByCustomerRes.body.data._id).toBe(leadId);
  });

  test('a customer with no originating lead returns null (not 404) from the by-customer lookup', async () => {
    const token = adminToken();
    const customerRepo = Source.getRepository(Customer);
    const customer = await customerRepo.save(
      customerRepo.create({ name: unique('Direct Customer') }),
    );

    const res = await request(app)
      .get(`/leads/by-customer/${customer.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  test('duplicate customer email is rejected with 409', async () => {
    const token = adminToken();
    const email = `${unique('dup')}@test.com`;
    const first = await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: unique('Customer'), email });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: unique('Customer'), email });
    expect(second.status).toBe(409);
  });
});
