import Redis from 'ioredis';
import { logger } from './logger';

export const redis = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 2000, 30000); // Exponential backoff capped at 30 seconds
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis connection error', err);
});
