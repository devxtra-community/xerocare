import type { ChartOfAccountRow } from './accountsApi';

/**
 * The expense categories an entry can be booked against.
 *
 * These keys are not cosmetic — `accountsShared.ts` maps each one to a chart-of-accounts
 * line, and a key it does not recognise falls into the "Other Expenses" catch-all. So the
 * list here mirrors that file's KNOWN_CATEGORIES exactly; adding a label here without
 * adding the key there would silently bury the expense in Other.
 *
 * Anything beyond these is defined by the user as a custom EXPENSE_CATEGORY_LINKED
 * account, which is why `expenseCategoryOptions()` merges those in rather than this being
 * a fixed list.
 */
export interface ExpenseCategoryOption {
  /** Stored on the entry as `category` — must match what the P&L looks up. */
  key: string;
  label: string;
  /** The chart-of-accounts line it lands on, shown so the user can see where it posts. */
  account: string;
  custom?: boolean;
}

export const SYSTEM_EXPENSE_CATEGORIES: ExpenseCategoryOption[] = [
  { key: 'SALARY', label: 'Salary & Wages', account: '5006 Salary Expense' },
  { key: 'RENT', label: 'Rent', account: '5008 Rent Expense' },
  { key: 'UTILITIES', label: 'Utilities', account: '5009 Utilities' },
  { key: 'TRAVEL', label: 'Travel', account: '5007 Travel Expense' },
  { key: 'MARKETING', label: 'Marketing & Advertising', account: '5010 Marketing' },
  { key: 'MAINTENANCE', label: 'Maintenance & Repairs', account: '5011 Maintenance' },
  { key: 'INSURANCE', label: 'Insurance', account: '5012 Insurance' },
  { key: 'SPARE_PARTS', label: 'Spare Parts', account: '5001 Cost of Parts' },
  { key: 'LABOUR', label: 'Technician Labour', account: '5002 Labour Cost' },
  { key: 'VENDOR_PURCHASE', label: 'Vendor Purchase', account: '5004 Vendor Purchases' },
  { key: 'IMPORT_LABOUR', label: 'Import / Purchase Labour', account: '5014 Import Labour' },
  { key: 'CUSTOMS_DUTY', label: 'Customs Duty', account: '5015 Customs Duty' },
  {
    key: 'CARD_PROCESSING_FEE',
    label: 'Card Processing Fees',
    account: '5016 Card Processing Fees',
  },
  { key: 'OTHER', label: 'Other Expenses', account: '5013 Other Expenses' },
];

/**
 * System categories plus the user's own expense accounts.
 *
 * A custom account only qualifies when it is active, an EXPENSE_CATEGORY_LINKED row and
 * carries a categoryKey — without that key there is nothing to write on the entry, and
 * the amount would never find its way back to the account it was meant for.
 */
export function expenseCategoryOptions(coaRows: ChartOfAccountRow[] = []): ExpenseCategoryOption[] {
  const seen = new Set(SYSTEM_EXPENSE_CATEGORIES.map((c) => c.key));
  const custom: ExpenseCategoryOption[] = [];

  for (const row of coaRows) {
    if (!row.isActive) continue;
    if (row.sourceType !== 'EXPENSE_CATEGORY_LINKED') continue;
    if (!row.categoryKey || seen.has(row.categoryKey)) continue;
    seen.add(row.categoryKey);
    custom.push({
      key: row.categoryKey,
      label: row.accountName,
      account: `${row.accountNumber} ${row.accountName}`,
      custom: true,
    });
  }

  return [...SYSTEM_EXPENSE_CATEGORIES, ...custom];
}

export function expenseCategoryLabel(
  key: string | undefined | null,
  options: ExpenseCategoryOption[] = SYSTEM_EXPENSE_CATEGORIES,
): string {
  if (!key) return '—';
  return options.find((o) => o.key === key)?.label ?? key.replace(/_/g, ' ');
}
