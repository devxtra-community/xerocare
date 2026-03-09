import { Source, connectWithRetry } from './src/config/db';

async function test() {
  Source.setOptions({ logging: true });
  try {
    await connectWithRetry(1000);
    console.log('Connected');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
