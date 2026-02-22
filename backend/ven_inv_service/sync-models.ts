import 'reflect-metadata';
import { Source } from './src/config/db';
import { ModelRepository } from './src/repositories/modelRepository';

async function run() {
  await Source.initialize();
  
  const modelRepo = new ModelRepository();
  const models = await Source.query(`SELECT id FROM "model"`);
  
  console.log(`Found ${models.length} models. Syncing quantities...`);
  
  for (const m of models) {
    try {
      await modelRepo.syncModelQuantities(m.id);
      console.log(`Synced model ${m.id}`);
    } catch (err) {
      console.error(`Error syncing model ${m.id}:`, err);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);
