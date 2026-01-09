export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export type ChartAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isGroup: boolean;
  parentId?: string | null;
  status: 'Active' | 'Inactive';
};

export const chartOfAccounts: ChartAccount[] = [
  {
    id: '1',
    code: '1000',
    name: 'Assets',
    type: 'Asset',
    isGroup: true,
    parentId: null,
    status: 'Active',
  },
  {
    id: '2',
    code: '1010',
    name: 'Cash',
    type: 'Asset',
    isGroup: false,
    parentId: '1',
    status: 'Active',
  },
  {
    id: '3',
    code: '1020',
    name: 'Bank',
    type: 'Asset',
    isGroup: false,
    parentId: '1',
    status: 'Active',
  },
  {
    id: '4',
    code: '2000',
    name: 'Liabilities',
    type: 'Liability',
    isGroup: true,
    parentId: null,
    status: 'Active',
  },
  {
    id: '5',
    code: '2010',
    name: 'Accounts Payable',
    type: 'Liability',
    isGroup: false,
    parentId: '4',
    status: 'Active',
  },
];

export type JournalStatus = 'Draft' | 'Posted';

export type JournalLine = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
};

export type JournalEntry = {
  id: string;
  date: string;
  reference: string;
  status: JournalStatus;
  lines: JournalLine[];
};

// export const mockJournals: JournalEntry[] = [];
export const mockJournals: JournalEntry[] = [
  {
    id: '1',
    date: '2026-01-10',
    reference: 'Office Rent',
    status: 'Posted',
    lines: [
      { id: 'l1', accountId: 'Rent', debit: 50000, credit: 0 },
      { id: 'l2', accountId: 'Bank', debit: 0, credit: 50000 },
    ],
  },
  {
    id: '2',
    date: '2026-01-15',
    reference: 'Electricity Bill',
    status: 'Draft',
    lines: [
      { id: 'l1', accountId: 'Electricity', debit: 8000, credit: 0 },
      { id: 'l2', accountId: 'Cash', debit: 0, credit: 8000 },
    ],
  },
];

export type AccountingPeriod = {
  id: string;
  month: string; // YYYY-MM
  status: 'Open' | 'Closed';
};

export const accountingPeriods: AccountingPeriod[] = [
  { id: '1', month: '2025-01', status: 'Closed' },
  { id: '2', month: '2025-02', status: 'Open' },
  { id: '3', month: '2025-03', status: 'Open' },
];

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  debit: number;
  credit: number;
};

export const buildTrialBalance = () => {
  const rows: Record<string, TrialBalanceRow> = {};

  mockJournals
    .filter((j) => j.status === 'Posted')
    .forEach((journal) => {
      journal.lines.forEach((line) => {
        if (!rows[line.accountId]) {
          const acc = chartOfAccounts.find((a) => a.id === line.accountId);

          if (!acc) return;

          rows[line.accountId] = {
            accountId: acc.id,
            code: acc.code,
            name: acc.name,
            debit: 0,
            credit: 0,
          };
        }

        rows[line.accountId].debit += line.debit;
        rows[line.accountId].credit += line.credit;
      });
    });

  return Object.values(rows);
};

export type LedgerRow = {
  date: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

export const buildLedgerForAccount = (accountId: string) => {
  const rows: LedgerRow[] = [];

  mockJournals
    .filter((j) => j.status === 'Posted')
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((journal) => {
      journal.lines.forEach((line) => {
        if (line.accountId === accountId) {
          rows.push({
            date: journal.date,
            reference: journal.reference,
            debit: line.debit,
            credit: line.credit,
            balance: 0, // compute later
          });
        }
      });
    });

  // running balance
  let running = 0;
  rows.forEach((r) => {
    running += r.debit - r.credit;
    r.balance = running;
  });

  return rows;
};

export type PLRow = {
  accountId: string;
  code: string;
  name: string;
  amount: number;
};

export const buildProfitAndLoss = (startDate: string, endDate: string) => {
  const income: PLRow[] = [];
  const expenses: PLRow[] = [];

  mockJournals
    .filter((j) => j.status === 'Posted' && j.date >= startDate && j.date <= endDate)
    .forEach((journal) => {
      journal.lines.forEach((line) => {
        const acc = chartOfAccounts.find((a) => a.id === line.accountId);
        if (!acc) return;

        if (acc.type === 'Income') {
          income.push({
            accountId: acc.id,
            code: acc.code,
            name: acc.name,
            amount: line.credit - line.debit,
          });
        }

        if (acc.type === 'Expense') {
          expenses.push({
            accountId: acc.id,
            code: acc.code,
            name: acc.name,
            amount: line.debit - line.credit,
          });
        }
      });
    });

  return { income, expenses };
};
