import { redisClient } from '../config/redis';
import { logger } from '../config/logger';

const DEFAULT_TTL = 3600; // 1 hour in seconds

/**
 * Get value from Redis cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = redisClient.getClient();
    if (!client || !redisClient.isReady()) {
      logger.warn('Redis not available, skipping cache read');
      return null;
    }

    const cached = await client.get(key);
    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as T;
  } catch (error) {
    logger.error(`Cache read error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in Redis cache with optional TTL
 */
export async function setCached(
  key: string,
  value: unknown,
  ttl: number = DEFAULT_TTL,
): Promise<void> {
  try {
    const client = redisClient.getClient();
    if (!client || !redisClient.isReady()) {
      logger.warn('Redis not available, skipping cache write');
      return;
    }

    await client.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error(`Cache write error for key ${key}:`, error);
  }
}

/**
 * Delete single key from cache
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    const client = redisClient.getClient();
    if (!client || !redisClient.isReady()) {
      logger.warn('Redis not available, skipping cache delete');
      return;
    }

    await client.del(key);
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  try {
    const client = redisClient.getClient();
    if (!client || !redisClient.isReady()) {
      logger.warn('Redis not available, skipping pattern delete');
      return;
    }

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Cache pattern delete error for pattern ${pattern}:`, error);
  }
}

/**
 * Get multiple values from cache
 */
export async function getMultipleCached<T>(keys: string[]): Promise<Map<string, T>> {
  const result = new Map<string, T>();

  try {
    const client = redisClient.getClient();
    if (!client || !redisClient.isReady()) {
      return result;
    }

    const values = await client.mGet(keys);

    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        try {
          result.set(key, JSON.parse(value) as T);
        } catch {
          logger.error(`Failed to parse cached value for key ${key}`);
        }
      }
    });
  } catch (error) {
    logger.error('Cache multi-get error:', error);
  }

  return result;
}

/**
 * Check if key exists in cache
 */
export async function existsInCache(key: string): Promise<boolean> {
  try {
    const client = redisClient.getClient();
    if (!client || !redisClient.isReady()) {
      return false;
    }

    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error(`Cache exists check error for key ${key}:`, error);
    return false;
  }
}
