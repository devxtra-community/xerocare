import { Source } from './src/config/db';
import { ModelRepository } from './src/repositories/modelRepository';

async function run() {
  console.log('Connecting to DB...');
  await Source.initialize();
  console.log('Connected.');

  const modelRepo = new ModelRepository();

  // Get all models
  const models = await Source.query('SELECT id FROM model');
  console.log(`Found ${models.length} models. Syncing...`);

  for (const row of models) {
    await modelRepo.syncModelQuantities(row.id);
    console.log(`Synced model: ${row.id}`);
  }

  console.log('Done!');
  await Source.destroy();
}

run().catch(console.error);
