import { Source } from './src/config/dataSource';
import { InvoiceRepository } from './src/repositories/invoiceRepository';

async function debug() {
  try {
    console.log('Initializing data source...');
    await Source.initialize();
    console.log('Data source initialized.');

    const repo = new InvoiceRepository();
    console.log('Fetching branch invoices for branch "some-branch"...');
    // We don't need a real branch ID just to test the query syntax
    const branchInvoices = await repo.findByBranchId('89c1f62d-0b1a-4f5e-9e7d-3a2b1c0d9e8f');
    console.log('Success!', branchInvoices.length);
  } catch (error) {
    console.error('ERROR DETECTED:');
    console.error(error);
  } finally {
    process.exit();
  }
}

debug();
