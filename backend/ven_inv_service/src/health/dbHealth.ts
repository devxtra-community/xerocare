import { Source } from '../config/db';

export const checkDatabase = async () => {
  try {
    if (!Source.isInitialized) {
      await Source.initialize();
    }

    await Source.query('SELECT 1');

    return {
      status: 'UP',
    };
  } catch (error: unknown) {
    return {
      status: 'DOWN',
      error: (error as Error).message,
    };
  }
};
