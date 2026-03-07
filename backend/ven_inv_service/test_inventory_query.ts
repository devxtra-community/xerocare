import { Source } from './src/config/db';
import { SparePartRepository } from './src/repositories/sparePartRepository';

(async () => {
  try {
    await Source.initialize();
    console.log('DB connected');
    const repo = new SparePartRepository();
    await repo.getInventory(undefined, undefined, undefined);
    console.log('Query successful');
  } catch (e: unknown) {
    console.error('Error during query:', (e as Error).message);
  } finally {
    await Source.destroy();
  }
})();
