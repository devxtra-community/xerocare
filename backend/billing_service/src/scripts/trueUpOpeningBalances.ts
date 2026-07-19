/**
 * One-time true-up: books an OPENING_BALANCE_EQUITY entry for every existing cash/bank
 * account's openingBalance that has no matching equity entry yet. Idempotent — skips
 * accounts that already have an OPENING_BALANCE_EQUITY entry linked to them.
 *
 * Run: npx ts-node src/scripts/trueUpOpeningBalances.ts
 */
import { Source } from '../config/dataSource';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { EquityEntry } from '../entities/equityEntryEntity';

async function main() {
  if (!Source.isInitialized) await Source.initialize();

  const accountRepo = Source.getRepository(CashBankAccount);
  const equityRepo = Source.getRepository(EquityEntry);

  const accounts = await accountRepo.find({ where: { isActive: true } });
  let created = 0;

  for (const acct of accounts) {
    const openingBalance = Number(acct.openingBalance ?? 0);
    if (openingBalance <= 0) continue;

    const existing = await equityRepo.findOne({
      where: { linkedCashAccountId: acct.id, type: 'OPENING_BALANCE_EQUITY' },
    });
    if (existing) {
      console.log(`Skip ${acct.name} (${acct.id}) — already has a true-up entry`);
      continue;
    }

    const count = await equityRepo.count();
    const entry = equityRepo.create({
      entryNo: `EQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'OPENING_BALANCE_EQUITY',
      description: `Opening balance true-up — ${acct.name}`,
      amount: openingBalance,
      currency: acct.currency || 'AED',
      branchId: acct.branchId,
      linkedCashAccountId: acct.id,
      notes:
        "Retroactive true-up: this account's opening balance had no equity/liability origin in the system. Booked as part of the multinational-grade accounts audit.",
      createdBy: '00000000-0000-0000-0000-000000000000',
    }) as unknown as EquityEntry;
    await equityRepo.save(entry);
    created++;
    console.log(
      `Created true-up entry for ${acct.name} (${acct.id}): ${acct.currency} ${openingBalance}`,
    );
  }

  console.log(`\nDone. Created ${created} true-up entries.`);
  await Source.destroy();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
