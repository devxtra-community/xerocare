import { Source } from '../config/dataSource';

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
    const err = error as Error;
    return {
      status: 'DOWN',
      error: err?.message || 'Unknown error',
    };
  }
};
