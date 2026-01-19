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
    const err = error instanceof Error ? error.message : String(error);
    return {
      status: 'DOWN',
      error: err,
    };
  }
};
