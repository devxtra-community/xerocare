import { Source } from '../config/dataSource';

async function sync() {
  try {
    console.log('Initializing DataSource...');
    await Source.initialize();
    console.log('Synchronizing Schema...');
    await Source.synchronize(false); // Sync without dropping
    console.log('Schema Synchronization Complete.');
    process.exit(0);
  } catch (err) {
    console.error('Schema Sync Failed:', err);
    process.exit(1);
  }
}

sync();
