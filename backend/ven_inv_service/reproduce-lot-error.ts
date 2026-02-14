import { Source } from './src/config/db';
import { LotService } from './src/services/lotService';

async function test() {
  try {
    await Source.initialize();
    const service = new LotService();
    console.log('Fetching lots...');
    const lots = await service.getAllLots();
    console.log('Lots fetched successfully:', lots.length);
    console.log('Attempting to stringify...');
    try {
      JSON.stringify(lots);
      console.log('Stringify successful');
    } catch (e: unknown) {
      console.error('Stringify failed:', (e as Error).message);
    }
  } catch (error) {
    console.error('ERROR DETECTED:', error);
  } finally {
    if (Source.isInitialized) {
      await Source.destroy();
    }
  }
}

test();
