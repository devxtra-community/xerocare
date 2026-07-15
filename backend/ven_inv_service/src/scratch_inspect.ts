import { Source } from './config/db';
import { Purchase } from './entities/purchaseEntity';

async function main() {
  await Source.initialize();
  console.log('DB connected');
  const repo = Source.getRepository(Purchase);
  const p = await repo.findOne({
    where: { id: '794f6c8c-12b7-4d7a-8f6a-4ffbd288dc05' }, // using substring search
  });
  if (p) {
    console.log('Found exactly by ID:', p);
  } else {
    const all = await repo.find();
    console.log('All purchases count:', all.length);
    const match = all.find((x) => x.id.startsWith('794f6c8c'));
    console.log('Matched purchase:', match);
  }
  await Source.destroy();
}

main().catch(console.error);
