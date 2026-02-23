import { redis } from '../config/redis';

export const checkRedis = async () => {
  try {
    const result = await redis.ping();

    if (result !== 'PONG') {
      throw new Error('Unexpected Redis response');
    }

    return {
      status: 'UP',
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      status: 'DOWN',
      error: err?.message || 'Unknown error',
    };
  }
};
