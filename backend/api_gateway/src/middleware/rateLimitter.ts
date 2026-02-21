import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: async (...args: string[]): Promise<any> => {
      return await redis.call(args[0], ...args.slice(1));
    },
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window (was 100 — too low for development)
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
});
