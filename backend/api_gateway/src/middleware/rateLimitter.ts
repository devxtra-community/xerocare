import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';
import { Request } from 'express';
import { verifyAccessToken } from '../utils/jwt';

// Key by IP + email/body so rotating-proxy attacks still hit per-target limits.
// Falls back to IP-only for routes that don't carry an email in the body.
function authKeyGenerator(req: Request): string {
  const rawIp = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const ip = ipKeyGenerator(rawIp);
  const email = (typeof req.body?.email === 'string' ? req.body.email : '').toLowerCase().trim();
  return email ? `${ip}:${email}` : ip;
}

// Key authenticated requests by userId, not IP. express-rate-limit's default (and our
// ipKeyGenerator) collapse IPv6 addresses into a /56 subnet block to stop trivial IPv6
// rotation — but that also means every request from localhost (::1) lands in the SAME
// bucket, regardless of which user or browser tab sent it. In production it has the same
// effect for any users sharing a NAT/proxy IP. Since almost every route behind this
// limiter is an authenticated API call, keying by the token's userId gives each user
// their own budget; only genuinely unauthenticated requests fall back to IP.
function globalKeyGenerator(req: Request): string {
  const token = req.headers?.authorization?.split(' ')[1];
  if (token) {
    try {
      const { userId } = verifyAccessToken(token);
      if (userId) return `user:${userId}`;
    } catch {
      // Expired/invalid token — fall through to IP-based keying below.
    }
  }
  const rawIp = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  return ipKeyGenerator(rawIp);
}

export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: async (...args: string[]): Promise<any> => {
      return await redis.call(args[0], ...args.slice(1));
    },
  }),
  keyGenerator: globalKeyGenerator,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per window (increased for development)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests, please try again later',
  },
});

export const otpSendLimiter = rateLimit({
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: async (...args: string[]): Promise<any> => {
      return await redis.call(args[0], ...args.slice(1));
    },
    prefix: 'rl:otp-send:',
  }),
  keyGenerator: authKeyGenerator,
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { message: 'Too many OTP requests, please try again after 10 minutes' },
});

export const otpVerifyLimiter = rateLimit({
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: async (...args: string[]): Promise<any> => {
      return await redis.call(args[0], ...args.slice(1));
    },
    prefix: 'rl:otp-verify:',
  }),
  keyGenerator: authKeyGenerator,
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: { message: 'Too many verification attempts, please try again after 10 minutes' },
});

export const loginLimiter = rateLimit({
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: async (...args: string[]): Promise<any> => {
      return await redis.call(args[0], ...args.slice(1));
    },
    prefix: 'rl:login:',
  }),
  keyGenerator: authKeyGenerator,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
});
