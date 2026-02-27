import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 2000, 30000); // Exponential backoff capped at 30 seconds
    return delay;
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});
