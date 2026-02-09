import { Source } from './src/config/db';
import { SparePartRepository } from './src/repositories/sparePartRepository';

async function test() {
  try {
    await Source.initialize();
    const repo = new SparePartRepository();
    // Use a dummy branch ID or one from existing data
    const dummyBranchId = 'any-uuid-or-real-id';
    const result = await repo.getInventoryByBranch(dummyBranchId);
    console.log('Result length:', result.length);
  } catch (error) {
    console.error('ERROR DETECTED:', error);
  } finally {
    await Source.destroy();
  }
}

test();
