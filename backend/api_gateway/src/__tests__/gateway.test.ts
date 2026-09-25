import request from 'supertest';
import http from 'http';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { app } from '../app';

/**
 * Real api_gateway behavior only. Two corrections to the original task's assumptions,
 * confirmed by reading app.ts directly:
 *
 * 1. There is no "role forwarding" feature — no proxy header (x-user-role, x-user-id, etc.)
 *    is ever injected from the decoded JWT. `createProxyMiddleware`'s only `proxyReq` hook
 *    is `fixRequestBody` (re-streams the already-consumed JSON body), which doesn't touch
 *    headers at all. The `Authorization` header is forwarded to the downstream service
 *    completely unchanged, and each downstream re-verifies it independently. What IS real
 *    and testable is gateway-level RBAC on the routes that explicitly declare
 *    authMiddleware+requireRole before the proxy call — most of `/e/*` and all of `/c/*`
 *    have NO such gate and skip gateway auth entirely, but `/i/service/tickets` does.
 * 2. `loginLimiter` (on /e/auth/login, /e/admin/login) is a hard no-op unless
 *    NODE_ENV==='production' — untestable here without changing NODE_ENV, which we
 *    deliberately don't do. `otpSendLimiter` on /e/auth/forgot-password is the real,
 *    always-active, low-threshold (5/10min) limiter used below instead.
 *
 * Every proxied route needs a live target: EMPLOYEE_SERVICE_URL / VENDOR_INVENTORY_SERVICE_URL
 * / BILLING_SERVICE_URL / CRM_SERVICE_URL are all pointed at the tiny local stub server
 * started below (.env.test fixes them to http://127.0.0.1:19191 — read at app.ts module
 * load time, so the port has to be fixed in advance, not chosen dynamically here).
 *
 * Fixed gap (was: `otpSendLimiter` mounted at app.ts:130 with no `express.json()` anywhere
 * before it, so `authKeyGenerator`'s `req.body?.email` read was always undefined and the
 * limiter silently fell back to IP-only keying — never the IP+email pairing its own code
 * comment described, meaning every caller behind one IP/NAT shared a single budget
 * regardless of which email they submitted). `app.ts` now parses the body for these
 * specific limiter-guarded routes before the limiter runs (`jsonParser` in app.ts, applied
 * only to the login/OTP routes — still no *global* body parser, since that would drain the
 * body stream for every proxied route too). The test below proves the real fix: two
 * different emails from the same IP each get their own 5-per-10-minute budget.
 *
 * The rate-limit bucket lives in Redis across separate test runs, so the test flushes its
 * own isolated Redis DB first (REDIS_URL is pointed at db 15 in .env.test, not the default
 * db 0 a real dev server would use).
 */

const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
const STUB_PORT = 19191;

let stubServer: http.Server;
let stubRequests: { method?: string; url?: string }[] = [];

function signToken(role: string, overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      userId: 'gateway-test-user',
      role,
      branchId: 'test-branch',
      email: 'test@xerocare.test',
      ...overrides,
    },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

let redis: Redis;

beforeAll(async () => {
  stubServer = http.createServer((req, res) => {
    stubRequests.push({ method: req.method, url: req.url });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { stub: true } }));
  });
  await new Promise<void>((resolve) => stubServer.listen(STUB_PORT, resolve));

  // Isolated test-only Redis DB (see file header) — flush it so leftover rate-limit
  // counters from an earlier run of this same file never leak into this one.
  redis = new Redis(process.env.REDIS_URL as string);
  await redis.flushdb();
}, 20000);

afterAll(async () => {
  await new Promise<void>((resolve) => stubServer.close(() => resolve()));
  await redis.quit();
});

beforeEach(() => {
  stubRequests = [];
});

describe('JWT verification on a fully local (non-proxied) route', () => {
  // GET /bank-reference/banks/:countryCode is served entirely in-process from a static
  // object literal (no DB, no downstream) — the cleanest route for testing gateway auth
  // in isolation from everything else.
  test('rejects requests with no token', async () => {
    const res = await request(app).get('/bank-reference/banks/AE');
    expect(res.status).toBe(401);
  });

  test('rejects a tampered/invalid token', async () => {
    const res = await request(app)
      .get('/bank-reference/banks/AE')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  test('rejects an expired token', async () => {
    const expired = jwt.sign({ userId: 'x', role: 'ADMIN' }, ACCESS_SECRET, { expiresIn: '-10s' });
    const res = await request(app)
      .get('/bank-reference/banks/AE')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  test('accepts a valid token and returns the real static bank list, untouched by any proxy', async () => {
    const res = await request(app)
      .get('/bank-reference/banks/AE')
      .set('Authorization', `Bearer ${signToken('EMPLOYEE')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(true);
    expect(Array.isArray(res.body.data.banks)).toBe(true);
    expect(res.body.data.banks.length).toBeGreaterThan(0);
    // Confirms this route never touched the stub — it's genuinely local.
    expect(stubRequests).toHaveLength(0);
  });
});

describe('Gateway-level RBAC before proxying (POST /i/service/tickets)', () => {
  test('a role not in the allow-list is rejected before the proxy ever runs', async () => {
    const res = await request(app)
      .post('/i/service/tickets')
      .set('Authorization', `Bearer ${signToken('HR')}`)
      .send({ issueDescription: 'test' });
    expect(res.status).toBe(403);
    expect(stubRequests).toHaveLength(0);
  });

  test('EMPLOYEE is allowed through and the request actually reaches the downstream', async () => {
    const res = await request(app)
      .post('/i/service/tickets')
      .set('Authorization', `Bearer ${signToken('EMPLOYEE')}`)
      .send({ issueDescription: 'test' });
    expect(res.status).toBe(200);
    expect(stubRequests).toHaveLength(1);
    expect(stubRequests[0].url).toBe('/service/tickets'); // pathRewrite strips the /i prefix
  });

  test('the Authorization header is forwarded to the downstream unchanged (no role-forwarding header exists)', async () => {
    const token = signToken('MANAGER');
    let capturedAuthHeader: string | undefined;
    const originalListener = stubServer.listeners('request')[0];
    stubServer.removeAllListeners('request');
    stubServer.on('request', (req, res) => {
      capturedAuthHeader = req.headers['authorization'];
      stubRequests.push({ method: req.method, url: req.url });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });

    await request(app)
      .post('/i/service/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ issueDescription: 'test' });

    expect(capturedAuthHeader).toBe(`Bearer ${token}`);

    // restore the default stub handler for subsequent tests
    stubServer.removeAllListeners('request');
    stubServer.on('request', originalListener as (...args: unknown[]) => void);
  });
});

describe('Rate limiting (otpSendLimiter on POST /e/auth/forgot-password — real regardless of NODE_ENV)', () => {
  async function sendFive(email: string): Promise<number[]> {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app).post('/e/auth/forgot-password').send({ email });
      statuses.push(res.status);
    }
    return statuses;
  }

  test('allows 5 requests then blocks the 6th with 429', async () => {
    const statuses = await sendFive(`ratelimit-${Date.now()}@xerocare.test`);
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  }, 20000);

  test('two different emails from the same IP get independent buckets (real IP+email keying, not IP-only)', async () => {
    // Before the express.json() ordering fix, authKeyGenerator's req.body.email read was
    // always undefined here, so both emails would have shared one IP-only bucket — the
    // second email's first request would already have been rejected as the 11th hit
    // against a shared budget of 5. With the fix, each gets its own fresh 5-request budget.
    const emailA = `ratelimit-a-${Date.now()}@xerocare.test`;
    const emailB = `ratelimit-b-${Date.now()}@xerocare.test`;

    const statusesA = await sendFive(emailA);
    expect(statusesA.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statusesA[5]).toBe(429);

    const statusesB = await sendFive(emailB);
    expect(statusesB.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statusesB[5]).toBe(429);
  }, 30000);
});
