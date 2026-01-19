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
    const err = error instanceof Error ? error.message : String(error);
    return {
      status: 'DOWN',
      error: err,
    };
  }
};
