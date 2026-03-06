import { Source } from '../config/db';
import { SparePart } from '../entities/sparePartEntity';
import { Model } from '../entities/modelEntity';
import { logger } from '../config/logger';

async function runMigration() {
  try {
    await Source.initialize();
    logger.info('Database connected. Starting SparePart models migration...');

    const spareParts = await Source.getRepository(SparePart).find({
      relations: {
        models: true,
      },
    });

    let migratedCount = 0;

    for (const part of spareParts) {
      if (part.model_id && (!part.models || part.models.length === 0)) {
        const model = await Source.getRepository(Model).findOneBy({ id: part.model_id });
        if (model) {
          part.models = [model];
          await Source.getRepository(SparePart).save(part);
          migratedCount++;
        }
      }
    }

    logger.info(`Migration complete! Successfully migrated ${migratedCount} spare parts.`);
    process.exit(0);
  } catch (error) {
    logger.error('Error during migration:', error);
    process.exit(1);
  }
}

runMigration();
