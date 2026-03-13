import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      const redisUrl = process.env.REDIS_URL as string;

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            // Infinite exponential backoff instead of failing at 10
            return Math.min(retries * 2000, 30000);
          },
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis: Connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis: Reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      return null;
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis: Disconnected');
    }
  }
}

export const redisClient = new RedisClient();

// Initialize Redis connection on module load
redisClient.connect().catch((err) => {
  logger.error('Failed to initialize Redis connection:', err);
});
