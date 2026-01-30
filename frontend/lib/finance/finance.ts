import { Product } from './ar';

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export type AccountStatus = 'Active' | 'Inactive';

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
    code: '4000',
    name: 'Income',
    type: 'Income',
    isGroup: true,
    parentId: null,
    status: 'Active',
  },
  {
    id: '5',
    code: '4010',
    name: 'Sales',
    type: 'Income',
    isGroup: false,
    parentId: '4',
    status: 'Active',
  },
  {
    id: '6',
    code: '5000',
    name: 'Expenses',
    type: 'Expense',
    isGroup: true,
    parentId: null,
    status: 'Active',
  },
  {
    id: '7',
    code: '5010',
    name: 'Rent Expense',
    type: 'Expense',
    isGroup: false,
    parentId: '6',
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
    id: 'jrn-001',
    date: '2026-01-01',
    reference: 'Opening Balance',
    status: 'Posted',
    lines: [
      {
        id: 'l1',
        accountId: '2', // Cash
        debit: 10000,
        credit: 0,
      },
    ],
  },

  {
    id: 'jrn-002',
    date: '2026-01-05',
    reference: 'Cash Sale Invoice #INV-001',
    status: 'Posted',
    lines: [
      {
        id: 'l2',
        accountId: '2', // Cash
        debit: 5000,
        credit: 0,
      },
      {
        id: 'l3',
        accountId: '5', // Sales
        debit: 0,
        credit: 5000,
      },
    ],
  },

  {
    id: 'jrn-003',
    date: '2026-01-10',
    reference: 'January Office Rent',
    status: 'Posted',
    lines: [
      {
        id: 'l4',
        accountId: '7', // Rent Expense
        debit: 2000,
        credit: 0,
      },
      {
        id: 'l5',
        accountId: '2', // Cash
        debit: 0,
        credit: 2000,
      },
    ],
  },
  {
    id: 'jrn-004',
    date: '2026-01-10',
    reference: 'January Office Rent',
    status: 'Draft',
    lines: [
      {
        id: 'l6',
        accountId: '7', // Rent Expense
        debit: 2000,
        credit: 0,
      },
      {
        id: 'l7',
        accountId: '2', // Cash
        debit: 0,
        credit: 2000,
      },
      {
        id: 'l7',
        accountId: '2', // Cash
        debit: 0,
        credit: 2000,
      },
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

export type GLPreviewLine = {
  accountNumber: string;
  accountName: string;
  credit: number;
  debit: number;
};

export type GLPostingPreview = {
  source: 'AR Invoice' | 'AP Invoice';
  sourceRef: string;
  date: string;
  lines: GLPreviewLine[];
  totalCredit: number;
  totalDebit: number;
};

export type PostingType = 'AR_INVOICE' | 'AP_INVOICE';

export type PostingConfig = {
  controlAccountCode: string;
  controlSide: 'debit' | 'credit';
  lineSide: 'debit' | 'credit';
  title: string;
};

export const POSTING_CONFIG: Record<PostingType, PostingConfig> = {
  AR_INVOICE: {
    controlAccountCode: '1010', // AR
    controlSide: 'debit',
    lineSide: 'credit',
    title: 'Accounts Receivable Posting Preview',
  },
  AP_INVOICE: {
    controlAccountCode: '2010', // AP
    controlSide: 'credit',
    lineSide: 'debit',
    title: 'Accounts Payable Posting Preview',
  },
};

export type PostingLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
};

export function buildPostingPreview({
  type,
  invoice,
  chartOfAccounts,
  products,
}: {
  type: PostingType;
  invoice: Record<string, unknown>;
  chartOfAccounts: ChartAccount[];
  products: Product[];
}): PostingLine[] {
  const config = POSTING_CONFIG[type];

  const controlAccount = chartOfAccounts.find((a) => a.code === config.controlAccountCode);
  if (!controlAccount) {
    throw new Error('Control account not found');
  }

  // ---- Build line entries ----
  const lineEntries: PostingLine[] = (invoice.lines as Array<Record<string, unknown>>).map(
    (line: Record<string, unknown>) => {
      let accountId: string | undefined;

      if (type === 'AR_INVOICE') {
        const product = products.find((p) => p.id === line.productId);
        accountId = product?.incomeAccountId;
      } else {
        accountId = line.expenseAccountId as string | undefined; // AP
      }

      const account = chartOfAccounts.find((a) => a.id === accountId);
      if (!account) throw new Error(`Account mapping missing: accountId=${accountId}`);

      const amount = line.amount as number;
      const description = line.description as string;

      return {
        accountCode: account.code,
        accountName: account.name,
        debit: config.lineSide === 'debit' ? amount : 0,
        credit: config.lineSide === 'credit' ? amount : 0,
        description: description,
      };
    },
  );

  // ---- Calculate total ----
  const total = lineEntries.reduce((sum, l) => sum + l.debit + l.credit, 0);

  // ---- Control entry ----
  const controlEntry: PostingLine = {
    accountCode: controlAccount.code,
    accountName: controlAccount.name,
    debit: config.controlSide === 'debit' ? total : 0,
    credit: config.controlSide === 'credit' ? total : 0,
    description: `${type} Invoice ${invoice.invoiceNumber}`,
  };

  return [controlEntry, ...lineEntries];
}
