import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';
import { Request } from 'express';

// Key by IP + email/body so rotating-proxy attacks still hit per-target limits.
// Falls back to IP-only for routes that don't carry an email in the body.
function authKeyGenerator(req: Request): string {
  const ip = (req.ip ?? req.socket?.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
  const email = (typeof req.body?.email === 'string' ? req.body.email : '').toLowerCase().trim();
  return email ? `${ip}:${email}` : ip;
}

export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: async (...args: string[]): Promise<any> => {
      return await redis.call(args[0], ...args.slice(1));
    },
  }),
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
