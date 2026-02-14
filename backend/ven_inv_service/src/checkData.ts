import { Source } from './config/db';
import { VendorRequest } from './entities/vendorRequestEntity';

const checkData = async () => {
  await Source.initialize();
  const repo = Source.getRepository(VendorRequest);
  const requests = await repo.find({
    order: { created_at: 'DESC' },
    take: 5,
  });
  console.log('Recent Requests:', JSON.stringify(requests, null, 2));
  process.exit(0);
};

checkData().catch(console.error);
