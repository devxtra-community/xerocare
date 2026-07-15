/**
 * seedTodayEntries.ts
 * Inserts realistic dummy cashbook entries for TODAY so the Day Book
 * immediately shows meaningful data. Safe to re-run — all inserts use
 * a unique sourceType/sourceId so the idempotency guard in postCashbookEntry
 * will skip duplicates.
 *
 * Run:  npx ts-node src/scripts/seedTodayEntries.ts
 */

import { Source } from '../config/dataSource';
import { logger } from '../config/logger';
import { postCashbookEntry } from '../services/cashbookService';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { todayInBusinessTz } from '../utils/businessDate';
import { createHash } from 'crypto';

// Generate deterministic UUID from a seed string so re-runs are idempotent
function seedUuid(key: string): string {
  const hash = createHash('sha1').update(key).digest('hex');
  // Format as UUID v4-like: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

const BRANCH_ID = 'f611ad69-8a40-4860-bd9b-509c06c832a7'; // xerocare pak
const CREATED_BY = '5359bfbd-ec9a-4ffc-9bdc-9450626a65f3'; // riyas (finance manager)

async function main() {
  try {
    if (!Source.isInitialized) {
      await Source.initialize();
      logger.info('Database initialized');
    }

    const today = todayInBusinessTz(); // e.g. "2026-07-12"
    logger.info(`Seeding dummy Day Book entries for date: ${today}`);

    // ── Resolve Cash and Bank account IDs for the branch ─────────────────────
    const accountRepo = Source.getRepository(CashBankAccount);
    const cashAcc = await accountRepo.findOne({
      where: { branchId: BRANCH_ID, type: 'CASH', isActive: true, isDefault: true },
    });
    const bankAcc = await accountRepo.findOne({
      where: { branchId: BRANCH_ID, type: 'BANK', isActive: true, isDefault: true },
    });

    if (!cashAcc || !bankAcc) {
      logger.error(
        'No default cash/bank accounts found for branch. Run seedAndBackfillCash.ts first.',
      );
      process.exit(1);
    }

    logger.info(`Using CASH account: ${cashAcc.name} (${cashAcc.id})`);
    logger.info(`Using BANK account: ${bankAcc.name} (${bankAcc.id})`);

    // ── Today's dummy transactions ────────────────────────────────────────────
    const entries: Parameters<typeof postCashbookEntry>[0][] = [
      // ---- RECEIPTS (cash inflows) ----
      {
        date: today,
        entryType: 'RECEIPT',
        amount: 2500,
        category: 'Customer Payment',
        description: 'Invoice payment — Samir Enterprises (SALE-2026-0012)',
        paymentMode: 'BANK_TRANSFER',
        accountId: bankAcc.id,
        branchId: BRANCH_ID,
        createdBy: CREATED_BY,
        referenceNo: `SEED-RCPT-A-${today}`,
        sourceType: 'SEED_TODAY',
        sourceId: seedUuid(`rcpt-a-${today}`),
      },
      {
        date: today,
        entryType: 'RECEIPT',
        amount: 750,
        category: 'Customer Payment',
        description: 'Cash payment received — Al Noor Trading',
        paymentMode: 'CASH',
        accountId: cashAcc.id,
        branchId: BRANCH_ID,
        createdBy: CREATED_BY,
        referenceNo: `SEED-RCPT-B-${today}`,
        sourceType: 'SEED_TODAY',
        sourceId: seedUuid(`rcpt-b-${today}`),
      },
      {
        date: today,
        entryType: 'RECEIPT',
        amount: 4800,
        category: 'Customer Payment',
        description: 'Monthly lease payment — Copier Lease Contract #LC-0045',
        paymentMode: 'BANK_TRANSFER',
        accountId: bankAcc.id,
        branchId: BRANCH_ID,
        createdBy: CREATED_BY,
        referenceNo: `SEED-RCPT-C-${today}`,
        sourceType: 'SEED_TODAY',
        sourceId: seedUuid(`rcpt-c-${today}`),
      },

      // ---- PAYMENTS (cash outflows) ----
      {
        date: today,
        entryType: 'PAYMENT',
        amount: 1200,
        category: 'Salary',
        description: 'Salary advance — Ahmed Khan (Technician)',
        paymentMode: 'CASH',
        accountId: cashAcc.id,
        branchId: BRANCH_ID,
        createdBy: CREATED_BY,
        referenceNo: `SEED-PAY-A-${today}`,
        sourceType: 'SEED_TODAY',
        sourceId: seedUuid(`pay-a-${today}`),
      },
      {
        date: today,
        entryType: 'PAYMENT',
        amount: 580,
        category: 'Office & Admin',
        description: 'Office stationery and printing supplies',
        paymentMode: 'CASH',
        accountId: cashAcc.id,
        branchId: BRANCH_ID,
        createdBy: CREATED_BY,
        referenceNo: `SEED-PAY-B-${today}`,
        sourceType: 'SEED_TODAY',
        sourceId: seedUuid(`pay-b-${today}`),
      },
      {
        date: today,
        entryType: 'PAYMENT',
        amount: 3200,
        category: 'Vendor Payment',
        description: 'Parts purchase — Xerox Gulf FZE (PO #PO-2026-0088)',
        paymentMode: 'BANK_TRANSFER',
        accountId: bankAcc.id,
        branchId: BRANCH_ID,
        createdBy: CREATED_BY,
        referenceNo: `SEED-PAY-C-${today}`,
        sourceType: 'SEED_TODAY',
        sourceId: seedUuid(`pay-c-${today}`),
      },
      {
        date: today,
        entryType: 'PAYMENT',
        amount: 420,
        category: 'Utilities',
        description: 'Electricity bill — PESCO July 2026',
        paymentMode: 'BANK_TRANSFER',
        accountId: bankAcc.id,
        branchId: BRANCH_ID,
        createdBy: CREATED_BY,
        referenceNo: `SEED-PAY-D-${today}`,
        sourceType: 'SEED_TODAY',
        sourceId: seedUuid(`pay-d-${today}`),
      },
    ];

    let posted = 0;
    let skipped = 0;
    for (const entry of entries) {
      const result = await postCashbookEntry(entry);
      if (result.referenceNo === entry.referenceNo) {
        posted++;
        logger.info(`  ✓ Posted: ${entry.referenceNo} — ${entry.entryType} ${entry.amount}`);
      } else {
        skipped++;
        logger.info(`  ↷ Skipped (already exists): ${entry.referenceNo}`);
      }
    }

    logger.info(`\nDone. Posted: ${posted}, Skipped: ${skipped}`);
    logger.info(`Day Book for ${today} should now show ${entries.length - skipped} entries.`);
  } catch (err) {
    logger.error('Error seeding today entries:', err);
    process.exit(1);
  } finally {
    if (Source.isInitialized) await Source.destroy();
  }
}

main();
