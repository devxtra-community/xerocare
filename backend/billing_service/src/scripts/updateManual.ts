import { Source } from '../config/dataSource';
import { CreditNote } from '../entities/creditNoteEntity';
import { CreditNoteStatus } from '../entities/enums/creditNoteStatus';

async function updateManual() {
  try {
    await Source.initialize();
    const repo = Source.getRepository(CreditNote);
    const cn = await repo.findOne({ where: { creditNoteNo: 'CN-2026-00001' } });
    if (cn) {
      cn.status = CreditNoteStatus.PRODUCT_REPLACED;
      await repo.save(cn);
      console.log('Successfully updated CN-2026-00001 to PRODUCT_REPLACED');
    } else {
      console.log('Credit Note not found');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await Source.destroy();
  }
}

updateManual();
