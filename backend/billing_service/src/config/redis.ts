import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT as string),
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 2000, 30000); // Exponential backoff capped at 30 seconds
    return delay;
  },
});
