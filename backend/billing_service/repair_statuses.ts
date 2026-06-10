import { Source as BillingSource } from './src/config/dataSource';
import { CreditNote } from './src/entities/creditNoteEntity';
import { Invoice } from './src/entities/invoiceEntity';
import { CreditNoteStatus } from './src/entities/enums/creditNoteStatus';
import { CreditNoteType } from './src/entities/enums/creditNoteType';
import { InvoiceStatus } from './src/entities/enums/invoiceStatus';

// We need to connect to Inventory DB too if we want to fix product status
// For now, I'll just emit the events for completed refunds to trigger the worker
import { emitProductStatusUpdate } from './src/events/publisher/productStatusEvent';

async function repair() {
  await BillingSource.initialize();
  console.log('Billing DB Initialized');

  const cnRepo = BillingSource.getRepository(CreditNote);
  const invRepo = BillingSource.getRepository(Invoice);

  const completedRefunds = await cnRepo.find({
    where: {
      type: CreditNoteType.DIRECT_REFUND,
      status: CreditNoteStatus.COMPLETED,
    },
  });

  console.log(`Found ${completedRefunds.length} completed refunds`);

  for (const cn of completedRefunds) {
    const inv = await invRepo.findOne({ where: { id: cn.invoiceId } });
    if (inv) {
      console.log(`Syncing Invoice ${inv.invoiceNumber} and Product ${cn.productId}`);

      // Fix Invoice Status if not already
      if (inv.status !== InvoiceStatus.REFUNDED) {
        inv.status = InvoiceStatus.REFUNDED;
        await invRepo.save(inv);
      }

      // Re-emit status update event to ensure Inventory is in sync
      await emitProductStatusUpdate({
        productId: cn.productId,
        billType: 'RETURNED', // Assuming returned for existing ones
        invoiceId: cn.invoiceId,
        approvedBy: 'SYSTEM_REPAIR',
        approvedAt: new Date(),
      });
    }
  }

  console.log('Repair and Re-sync completed');
  process.exit(0);
}

repair().catch((err) => {
  console.error(err);
  process.exit(1);
});
