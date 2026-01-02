import { redis } from '../config/redis';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';

interface RateLimitOptions {
  keyPrefix: string;
  windowSec: number;
  max: number;
}

export const redisRateLimiter =
  (options: RateLimitOptions) => async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.body?.email ?? req.ip ?? 'unknown';

    const key = `${options.keyPrefix}:${identifier}`;

    try {
      const count = await Promise.race([
        redis.incr(key),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 500),
        ),
      ]);

      if (count === 1) {
        await redis.expire(key, options.windowSec);
      }

      if (count > options.max) {
        return next(new AppError('Too many requests. Please try again later.', 429));
      }

      return next();
    } catch (err: any) {
      console.error('Rate limiter skipped:', err.message);
      return next();
    }
  };
