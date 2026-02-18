import { Source } from './src/config/db';
import { Lot } from './src/entities/lotEntity';

async function debugQuery() {
  try {
    await Source.initialize();
    const repo = Source.getRepository(Lot);
    console.log('Running getAllLots query logic...');

    const [, count] = await repo.findAndCount({
      relations: {
        vendor: true,
        items: {
          model: {
            brandRelation: true,
          },
          sparePart: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    console.log(`Success! Found ${count} lots.`);
    await Source.destroy();
  } catch (err: unknown) {
    console.error('FAILED with error:');
    const e = err as Record<string, unknown>;
    console.error(e.message);
    if (e.query) {
      console.log('Failing SQL:');
      console.log(e.query);
      console.log('Parameters:', e.parameters);
    }
    await Source.destroy();
  }
}

debugQuery();
