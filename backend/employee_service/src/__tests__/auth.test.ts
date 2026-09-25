import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { app } from '../app';
import { connectWithRetry, Source } from '../config/dataSource';
import { redis } from '../config/redis';
import { Employee, EmployeeStatus } from '../entities/employeeEntities';
import { EmployeeRole } from '../constants/employeeRole';

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;

// Real default admin, created by seedAdmin() during connectWithRetry() whenever
// NODE_ENV !== 'production' (src/utils/seedAdmin.ts) — not the fictional
// 'Xerocare@uae123' password from an earlier draft of this suite.
const SEEDED_ADMIN_EMAIL = 'admin@xerocare.com';
const SEEDED_ADMIN_PASSWORD = 'admin123';

let uniqueCounter = 0;

function uniqueEmail(label: string) {
  uniqueCounter += 1;
  return `${label}-${Date.now()}-${uniqueCounter}@xerocare.test`;
}

function signTestToken(
  overrides: Partial<{
    userId: string;
    branchId: string;
    email: string;
    role: string;
    employeeJob: string | null;
    financeJob: string | null;
  }> = {},
) {
  return jwt.sign(
    {
      userId: 'test-user-id',
      branchId: 'branch-a',
      email: 'token-user@xerocare.test',
      role: EmployeeRole.EMPLOYEE,
      employeeJob: null,
      financeJob: null,
      ...overrides,
    },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

async function createTestEmployee(overrides: Partial<Employee> = {}) {
  const repo = Source.getRepository(Employee);
  const password_hash = await bcrypt.hash('Test@1234', 10);
  const employee = repo.create({
    email: uniqueEmail('employee'),
    password_hash,
    role: EmployeeRole.EMPLOYEE,
    status: EmployeeStatus.ACTIVE,
    ...overrides,
  });
  return repo.save(employee);
}

beforeAll(async () => {
  await connectWithRetry();
}, 60000);

afterAll(async () => {
  await redis.quit();
  await Source.destroy();
});

describe('Admin login (POST /admin/login)', () => {
  // Real AdminService.login has no OTP step at all — 2FA only applies to the
  // employee /auth/login flow below, unlike the fictional OTP-gated admin flow.
  test('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ email: SEEDED_ADMIN_EMAIL, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects a non-existent email with 404 (real code has no user-enumeration guard here)', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ email: 'nobody@xerocare.test', password: 'whatever' });
    expect(res.status).toBe(404);
  });

  test('logs in immediately on correct credentials, no OTP', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ email: SEEDED_ADMIN_EMAIL, password: SEEDED_ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.message).toContain('Admin login successfully');
  });
});

describe('Employee login + OTP (POST /auth/login, /auth/login/verify)', () => {
  test('rejects a non-existent email with 404', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@xerocare.test', password: 'whatever' });
    expect(res.status).toBe(404);
  });

  test('rejects wrong password with 401', async () => {
    const employee = await createTestEmployee();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: employee.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('correct credentials send an OTP instead of issuing tokens immediately', async () => {
    const employee = await createTestEmployee();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: employee.email, password: 'Test@1234' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeUndefined();
    expect(res.body.message.toLowerCase()).toContain('otp');
  });

  test('verifying the real OTP (read back from Redis) issues tokens and a trusted-device cookie', async () => {
    const employee = await createTestEmployee();
    await request(app).post('/auth/login').send({ email: employee.email, password: 'Test@1234' });

    // otpService stores the OTP at otp:<purpose>:<email> for 300s (src/services/otpService.ts) —
    // read it back exactly as the real email would have delivered it, instead of relying on the
    // NODE_ENV==='development' literal-'123456' bypass (we run as NODE_ENV=test on purpose).
    const otp = await redis.get(`otp:LOGIN:${employee.email}`);
    expect(otp).toMatch(/^\d{6}$/);

    const verifyRes = await request(app)
      .post('/auth/login/verify')
      .send({ email: employee.email, otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toBeDefined();
    const cookies = verifyRes.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookies?.some((c) => c.startsWith('xc_device_token'))).toBe(true);
  });

  test('rejects a wrong OTP with 400', async () => {
    const employee = await createTestEmployee();
    await request(app).post('/auth/login').send({ email: employee.email, password: 'Test@1234' });
    const res = await request(app)
      .post('/auth/login/verify')
      .send({ email: employee.email, otp: '000000' });
    expect(res.status).toBe(400);
  });

  test('skips OTP entirely on a valid trusted-device cookie from a prior verify', async () => {
    const employee = await createTestEmployee();
    await request(app).post('/auth/login').send({ email: employee.email, password: 'Test@1234' });
    const otp = await redis.get(`otp:LOGIN:${employee.email}`);
    const verifyRes = await request(app)
      .post('/auth/login/verify')
      .send({ email: employee.email, otp });
    const deviceCookie = (verifyRes.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('xc_device_token'),
    ) as string;

    const secondLogin = await request(app)
      .post('/auth/login')
      .set('Cookie', deviceCookie)
      .send({ email: employee.email, password: 'Test@1234' });

    expect(secondLogin.status).toBe(200);
    expect(secondLogin.body.accessToken).toBeDefined();
    expect(secondLogin.body.message.toLowerCase()).not.toContain('otp');
  });
});

describe('JWT verification (authMiddleware, on GET /employee)', () => {
  test('rejects requests with no token', async () => {
    const res = await request(app).get('/employee');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No access token');
  });

  test('rejects an expired token with TOKEN_EXPIRED', async () => {
    const expired = jwt.sign({ userId: 'x', role: EmployeeRole.ADMIN }, ACCESS_SECRET, {
      expiresIn: '-10s',
    });
    const res = await request(app).get('/employee').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  test('rejects a tampered/malformed token with TOKEN_INVALID', async () => {
    const res = await request(app)
      .get('/employee')
      .set('Authorization', 'Bearer fake.tampered.token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });

  test('refresh token issues a new access token', async () => {
    const employee = await createTestEmployee();
    await request(app).post('/auth/login').send({ email: employee.email, password: 'Test@1234' });
    const otp = await redis.get(`otp:LOGIN:${employee.email}`);
    const verifyRes = await request(app)
      .post('/auth/login/verify')
      .send({ email: employee.email, otp });
    const refreshCookie = (verifyRes.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('refreshToken='),
    ) as string;

    const refreshRes = await request(app).post('/auth/refresh').set('Cookie', refreshCookie);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
  });
});

describe('Role-based access control (requireRole)', () => {
  test('FINANCE cannot create payroll (HR/ADMIN/MANAGER only)', async () => {
    const token = signTestToken({ role: EmployeeRole.FINANCE });
    const res = await request(app)
      .post('/payroll')
      .set('Authorization', `Bearer ${token}`)
      .send({ employee_id: 'whatever', salary_amount: 1000 });
    expect(res.status).toBe(403);
  });

  test('MANAGER cannot delete an employee (ADMIN/HR only)', async () => {
    const employee = await createTestEmployee();
    const token = signTestToken({ role: EmployeeRole.MANAGER, branchId: employee.branch_id ?? '' });
    const res = await request(app)
      .delete(`/employee/${employee.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('MANAGER cannot view an employee from another branch', async () => {
    const employee = await createTestEmployee({ branch_id: 'branch-qatar' });
    const token = signTestToken({ role: EmployeeRole.MANAGER, branchId: 'branch-uae' });
    const res = await request(app)
      .get(`/employee/${employee.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('another branch');
  });

  test('MANAGER can view an employee from their own branch', async () => {
    const employee = await createTestEmployee({ branch_id: 'branch-uae' });
    const token = signTestToken({ role: EmployeeRole.MANAGER, branchId: 'branch-uae' });
    const res = await request(app)
      .get(`/employee/${employee.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('ADMIN can reach across branches without an explicit branch match', async () => {
    const employee = await createTestEmployee({ branch_id: 'branch-qatar' });
    // ADMIN tokens carry no branchId at all — the branch check in getEmployeeById only
    // applies to MANAGER, so ADMIN never needs the x-acting-branch override just to read.
    const token = signTestToken({ role: EmployeeRole.ADMIN, branchId: '' });
    const res = await request(app)
      .get(`/employee/${employee.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
