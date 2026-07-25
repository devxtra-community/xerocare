'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import {
  DrilldownModal,
  type DrilldownNode,
  type DrilldownColumn,
  type DrilldownFilters,
} from './RevenueDrilldown';
import {
  fetchCashBankAccounts,
  fetchManualReceivables,
  fetchExpenseEntries,
  fetchAccountsReceivableTransactions,
  fetchGuaranteeCheques,
  type CashBankAccount,
  type ManualReceivable,
  type ExpenseEntry,
  type ReceivableRow,
  type GuaranteeCheque,
} from '@/lib/finance/accountsApi';
import { fetchSpareParts, fetchProducts } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface CommonModalProps {
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  cashBankPagePath: string;
  onClose: () => void;
}

// ─── 1001 Cash in Hand / 1002 Cash at Bank ────────────────────────────────────

function filterCashBankRows(rows: CashBankAccount[], f: DrilldownFilters): CashBankAccount[] {
  let out = rows;
  if (f.customerName) {
    const needle = f.customerName.toLowerCase();
    out = out.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) || (a.bankName ?? '').toLowerCase().includes(needle),
    );
  }
  if (f.amountMin) out = out.filter((a) => Number(a.currentBalance) >= Number(f.amountMin));
  if (f.amountMax) out = out.filter((a) => Number(a.currentBalance) <= Number(f.amountMax));
  return out;
}

export function CashInHandModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  cashBankPagePath,
  onClose,
}: CommonModalProps) {
  const columns: DrilldownColumn<CashBankAccount>[] = [
    {
      header: 'Account Name',
      render: (a) => <span className="text-sm font-medium">{a.name}</span>,
    },
    {
      header: 'Branch',
      render: (a) => (
        <span className="font-mono text-xs text-muted-foreground">{a.branchId?.slice(0, 8)}…</span>
      ),
    },
    {
      header: 'Opening Balance',
      align: 'right',
      render: (a) => (
        <span className="text-xs tabular-nums">
          {formatCurrency(Number(a.openingBalance), a.currency)}
        </span>
      ),
    },
    {
      header: 'Current Balance',
      align: 'right',
      render: (a) => (
        <span className="font-bold tabular-nums text-slate-800">
          {formatCurrency(Number(a.currentBalance), a.currency)}
        </span>
      ),
    },
    {
      header: 'Responsible Person',
      render: (a) => <span className="text-xs">{a.contactPerson || '—'}</span>,
    },
    {
      header: 'Opening Date',
      render: (a) => (
        <span className="font-mono text-xs text-muted-foreground">
          {a.openingDate?.slice(0, 10) ?? '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (a) => (
        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${a.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
        >
          {a.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: '',
      render: () => (
        <Link
          href={cashBankPagePath}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Daybook
        </Link>
      ),
    },
  ];

  return (
    <DrilldownModal<CashBankAccount>
      title="Cash in Hand"
      queryKey="cash-in-hand"
      fetchRows={async (f) => {
        const rows = await fetchCashBankAccounts({ branchId: f.branchId ?? branchId });
        let out = rows.filter((a) => a.type === 'CASH');
        // Default to active-only, matching the headline (WHERE "isActive" = true) —
        // only an explicit search for "inactive" widens it.
        if (f.search === 'inactive') out = out.filter((a) => !a.isActive);
        else out = out.filter((a) => a.isActive);
        return filterCashBankRows(out, f);
      }}
      columns={columns}
      getAmount={(a) => Number(a.currentBalance)}
      getCurrency={(a) => a.currency}
      nameFilterLabel="Account/bank name"
      searchFilterLabel="active / inactive"
      showDateRange={false}
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

export function CashAtBankModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  cashBankPagePath,
  onClose,
}: CommonModalProps) {
  const columns: DrilldownColumn<CashBankAccount>[] = [
    {
      header: 'Account Name',
      render: (a) => <span className="text-sm font-medium">{a.name}</span>,
    },
    { header: 'Bank Name', render: (a) => <span className="text-xs">{a.bankName || '—'}</span> },
    {
      header: 'Branch',
      render: (a) => (
        <span className="font-mono text-xs text-muted-foreground">{a.branchId?.slice(0, 8)}…</span>
      ),
    },
    {
      header: 'Account # / IBAN',
      render: (a) => <span className="font-mono text-xs">{a.iban || a.accountNumber || '—'}</span>,
    },
    { header: 'Currency', render: (a) => <span className="text-xs">{a.currency}</span> },
    {
      header: 'Current Balance',
      align: 'right',
      render: (a) => (
        <span className="font-bold tabular-nums text-slate-800">
          {formatCurrency(Number(a.currentBalance), a.currency)}
        </span>
      ),
    },
    {
      header: 'Responsible Person',
      render: (a) => <span className="text-xs">{a.contactPerson || '—'}</span>,
    },
    {
      header: 'Status',
      render: (a) => (
        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${a.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
        >
          {a.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: '',
      render: () => (
        <Link
          href={cashBankPagePath}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Daybook
        </Link>
      ),
    },
  ];

  return (
    <DrilldownModal<CashBankAccount>
      title="Cash at Bank"
      queryKey="cash-at-bank"
      fetchRows={async (f) => {
        const rows = await fetchCashBankAccounts({ branchId: f.branchId ?? branchId });
        // Active-only, matching the headline (WHERE "isActive" = true).
        let out = rows.filter((a) => a.type === 'BANK' && a.isActive);
        if (f.search) {
          const needle = f.search.toLowerCase();
          out = out.filter((a) => (a.bankName ?? '').toLowerCase().includes(needle));
        }
        return filterCashBankRows(out, f);
      }}
      columns={columns}
      getAmount={(a) => Number(a.currentBalance)}
      getCurrency={(a) => a.currency}
      nameFilterLabel="Account name"
      searchFilterLabel="Bank name"
      showDateRange={false}
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── 1003 Accounts Receivable ───────────────────────────────────────────────────

const arColumns: DrilldownColumn<ReceivableRow>[] = [
  {
    header: 'Customer',
    render: (r) => <span className="text-sm font-medium">{r.customerName}</span>,
  },
  {
    header: 'Invoice #',
    render: (r) => <span className="font-mono text-xs text-blue-600">{r.invoiceNumber}</span>,
  },
  { header: 'Sale Type', render: (r) => <span className="text-xs">{r.saleType}</span> },
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (r) => (
      <span className="text-xs tabular-nums">{formatCurrency(r.totalAmount, r.currencyCode)}</span>
    ),
  },
  {
    header: 'Outstanding',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(r.amount, r.currencyCode)}
      </span>
    ),
  },
  {
    header: 'Aging',
    render: (r) => (
      <span
        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${r.aging === 'Current' ? 'bg-emerald-50 text-emerald-700' : r.aging === '90+ days' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
      >
        {r.aging}
      </span>
    ),
  },
];

export function AccountsReceivableModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<ReceivableRow>
      title="Accounts Receivable"
      queryKey="accounts-receivable"
      fetchRows={(f) =>
        fetchAccountsReceivableTransactions({ ...f, branchId: f.branchId ?? branchId })
      }
      columns={arColumns}
      getAmount={(r) => r.amount}
      getCurrency={(r) => r.currencyCode}
      nameFilterLabel="Customer name"
      searchFilterLabel="Invoice #"
      periodFrom={periodFrom}
      periodTo={periodTo}
      seedDateRangeFromPeriod={false}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── 1004 Security Deposits Receivable (+ guarantee cheques, cross-referenced) ─

type DepositDisplayRow =
  | { kind: 'DEPOSIT'; row: ManualReceivable }
  | { kind: 'GUARANTEE_CHEQUE'; row: GuaranteeCheque };

const depositColumns: DrilldownColumn<DepositDisplayRow>[] = [
  {
    header: 'Type',
    render: (d) =>
      d.kind === 'DEPOSIT' ? (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
          Cash Deposit
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700">
          Guarantee Cheque (not in total)
        </span>
      ),
  },
  {
    header: 'Customer',
    render: (d) => (
      <span className="text-sm font-medium">
        {d.kind === 'DEPOSIT' ? (d.row.customerName ?? '—') : d.row.customerName}
      </span>
    ),
  },
  {
    header: 'Contract Ref',
    render: (d) => (
      <span className="font-mono text-xs text-blue-600">
        {d.kind === 'DEPOSIT' ? d.row.referenceNo : (d.row.contractReference ?? d.row.chequeNumber)}
      </span>
    ),
  },
  {
    header: 'Date',
    render: (d) => (
      <span className="font-mono text-xs text-muted-foreground">
        {(d.kind === 'DEPOSIT' ? d.row.issueDate : d.row.receivedDate)?.slice(0, 10)}
      </span>
    ),
  },
  {
    header: 'Status',
    render: (d) => (
      <span className="text-xs">{d.kind === 'DEPOSIT' ? d.row.status : d.row.status}</span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (d) => (
      <span
        className={`font-bold tabular-nums ${d.kind === 'DEPOSIT' ? 'text-slate-800' : 'text-muted-foreground'}`}
      >
        {formatCurrency(
          Number(d.kind === 'DEPOSIT' ? d.row.outstanding : d.row.amount),
          d.kind === 'DEPOSIT' ? d.row.currency : d.row.currencyCode,
        )}
      </span>
    ),
  },
];

export function SecurityDepositsReceivableModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<DepositDisplayRow>
      title="Security Deposits Receivable"
      queryKey="security-deposits-receivable"
      fetchRows={async (f) => {
        const effectiveBranch = f.branchId ?? branchId;
        const [deposits, cheques] = await Promise.all([
          fetchManualReceivables({ type: 'SECURITY_DEPOSIT', branchId: effectiveBranch }),
          fetchGuaranteeCheques({
            status: 'RECEIVED',
            branchIds: effectiveBranch,
          }),
        ]);
        let rows: DepositDisplayRow[] = [
          ...deposits
            .filter((d) => d.status !== 'PAID' && d.status !== 'WRITTEN_OFF')
            .map((row) => ({ kind: 'DEPOSIT' as const, row })),
          ...cheques.map((row) => ({ kind: 'GUARANTEE_CHEQUE' as const, row })),
        ];
        if (f.customerName) {
          const needle = f.customerName.toLowerCase();
          rows = rows.filter((d) =>
            (d.kind === 'DEPOSIT' ? d.row.customerName : d.row.customerName)
              ?.toLowerCase()
              .includes(needle),
          );
        }
        if (f.dateFrom) {
          rows = rows.filter(
            (d) =>
              (d.kind === 'DEPOSIT' ? d.row.issueDate : d.row.receivedDate)?.slice(0, 10) >=
              f.dateFrom!,
          );
        }
        if (f.dateTo) {
          rows = rows.filter(
            (d) =>
              (d.kind === 'DEPOSIT' ? d.row.issueDate : d.row.receivedDate)?.slice(0, 10) <=
              f.dateTo!,
          );
        }
        return rows;
      }}
      columns={depositColumns}
      getAmount={(d) => (d.kind === 'DEPOSIT' ? Number(d.row.outstanding) : 0)}
      getCurrency={(d) => (d.kind === 'DEPOSIT' ? d.row.currency : d.row.currencyCode)}
      nameFilterLabel="Customer name"
      showAmountRange={false}
      periodFrom={periodFrom}
      periodTo={periodTo}
      seedDateRangeFromPeriod={false}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── 1005 Prepaid Expenses ──────────────────────────────────────────────────────

const prepaidColumns: DrilldownColumn<ExpenseEntry>[] = [
  { header: 'Description', render: (r) => <span className="text-sm">{r.description}</span> },
  {
    header: 'Category',
    render: (r) => <span className="text-xs">{r.category.replace(/_/g, ' ')}</span>,
  },
  {
    header: 'Paid Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">
        {r.paymentDate?.slice(0, 10) ?? r.date?.slice(0, 10)}
      </span>
    ),
  },
  {
    header: 'Covered Period',
    render: (r) => (
      <span className="text-xs text-muted-foreground">
        {r.coveredPeriodStart?.slice(0, 10)} → {r.coveredPeriodEnd?.slice(0, 10)}
      </span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(Number(r.netAmount), r.currency)}
      </span>
    ),
  },
];

export function PrepaidExpensesModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<ExpenseEntry>
      title="Prepaid Expenses"
      queryKey="prepaid-expenses"
      fetchRows={async (f) => {
        const rows = await fetchExpenseEntries({
          isPrepayment: true,
          status: 'PAID',
          branchId: f.branchId ?? branchId,
        });
        const today = new Date().toISOString().slice(0, 10);
        let out = rows.filter((r) => (r.coveredPeriodEnd ?? '') >= today);
        if (f.search) {
          const needle = f.search.toLowerCase();
          out = out.filter((r) => r.description?.toLowerCase().includes(needle));
        }
        if (f.amountMin) out = out.filter((r) => Number(r.netAmount) >= Number(f.amountMin));
        if (f.amountMax) out = out.filter((r) => Number(r.netAmount) <= Number(f.amountMax));
        return out;
      }}
      columns={prepaidColumns}
      getAmount={(r) => Number(r.netAmount)}
      getCurrency={(r) => r.currency}
      searchFilterLabel="Description"
      showDateRange={false}
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── 1006 Spare Parts Inventory ─────────────────────────────────────────────────
// Note: the SparePart entity's own TS properties are snake_case (part_name,
// item_code, purchase_price, quantity — matching DB columns 1:1, no camelCase
// mapping), which doesn't match the existing frontend SparePart interface
// (name/sku/costPrice) — same staleness as ProductAsset above, read real fields.

interface RawSparePartRow {
  id: string;
  item_code: string;
  part_name: string;
  brand?: string;
  branch_id: string;
  warehouse_id?: string;
  purchase_price: string | number;
  quantity: number;
}

const sparePartColumns: DrilldownColumn<RawSparePartRow>[] = [
  {
    header: 'Part Name',
    render: (p) => <span className="text-sm font-medium">{p.part_name}</span>,
  },
  {
    header: 'SKU',
    render: (p) => <span className="font-mono text-xs text-blue-600">{p.item_code}</span>,
  },
  { header: 'Brand', render: (p) => <span className="text-xs">{p.brand ?? '—'}</span> },
  {
    header: 'Quantity',
    align: 'right',
    render: (p) => <span className="text-xs tabular-nums">{p.quantity}</span>,
  },
  {
    header: 'Unit Cost',
    align: 'right',
    render: (p) => (
      <span className="text-xs tabular-nums">
        {formatCurrency(Number(p.purchase_price), 'AED')}
      </span>
    ),
  },
  {
    header: 'Total Value',
    align: 'right',
    render: (p) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(Number(p.purchase_price) * Number(p.quantity), 'AED')}
      </span>
    ),
  },
];

export function SparePartsInventoryModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<RawSparePartRow>
      title="Spare Parts Inventory"
      queryKey="spare-parts-inventory"
      showDateRange={false}
      fetchRows={async (f) => {
        const rows = (await fetchSpareParts({
          branchId: f.branchId ?? branchId,
        })) as unknown as RawSparePartRow[];
        let out = rows;
        if (f.customerName) {
          const needle = f.customerName.toLowerCase();
          out = out.filter(
            (p) =>
              p.part_name?.toLowerCase().includes(needle) ||
              p.item_code?.toLowerCase().includes(needle),
          );
        }
        if (f.amountMin)
          out = out.filter(
            (p) => Number(p.purchase_price) * Number(p.quantity) >= Number(f.amountMin),
          );
        if (f.amountMax)
          out = out.filter(
            (p) => Number(p.purchase_price) * Number(p.quantity) <= Number(f.amountMax),
          );
        return out;
      }}
      columns={sparePartColumns}
      getAmount={(p) => Number(p.purchase_price) * Number(p.quantity)}
      getCurrency={() => 'AED'}
      nameFilterLabel="Part name / SKU"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── 1009 Product Inventory ─────────────────────────────────────────────────────
// Only AVAILABLE-status products count — matches the exact population
// ven_inv_service's inventory-value endpoint sums for this Chart of Accounts line.
// Note: the raw /i/products response (serial_no, name, brand, purchase_price,
// nested model/warehouse) doesn't match the existing ProductAsset TS interface's
// camelCase fields (serialNumber/modelName/etc — that interface appears stale
// against the real API shape), so this reads the real fields directly instead.

interface RawProductRow {
  id: string;
  serial_no: string;
  name: string;
  brand: string;
  purchase_price: string | number;
  product_status: string;
  created_at: string;
  model?: { model_name?: string };
  warehouse?: { warehouseName?: string; branchId?: string };
  lot?: { branch_id?: string };
}

const productColumns: DrilldownColumn<RawProductRow>[] = [
  {
    header: 'Serial #',
    render: (p) => <span className="font-mono text-xs text-blue-600">{p.serial_no}</span>,
  },
  {
    header: 'Model',
    render: (p) => <span className="text-sm">{p.model?.model_name ?? p.name}</span>,
  },
  { header: 'Brand', render: (p) => <span className="text-xs">{p.brand}</span> },
  {
    header: 'Warehouse',
    render: (p) => <span className="text-xs">{p.warehouse?.warehouseName ?? '—'}</span>,
  },
  {
    header: 'Purchase Date',
    render: (p) => (
      <span className="font-mono text-xs text-muted-foreground">{p.created_at?.slice(0, 10)}</span>
    ),
  },
  {
    header: 'Purchase Price',
    align: 'right',
    render: (p) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(Number(p.purchase_price ?? 0), 'AED')}
      </span>
    ),
  },
];

export function ProductInventoryModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: CommonModalProps) {
  return (
    <DrilldownModal<RawProductRow>
      title="Product Inventory"
      queryKey="product-inventory"
      showDateRange={false}
      fetchRows={async (f) => {
        const rows = (await fetchProducts({
          status: 'AVAILABLE',
          branchId: f.branchId ?? branchId,
        })) as unknown as RawProductRow[];
        let out = rows;
        if (f.customerName) {
          const needle = f.customerName.toLowerCase();
          out = out.filter(
            (p) =>
              (p.model?.model_name ?? p.name)?.toLowerCase().includes(needle) ||
              p.brand?.toLowerCase().includes(needle) ||
              p.serial_no?.toLowerCase().includes(needle),
          );
        }
        if (f.amountMin)
          out = out.filter((p) => Number(p.purchase_price ?? 0) >= Number(f.amountMin));
        if (f.amountMax)
          out = out.filter((p) => Number(p.purchase_price ?? 0) <= Number(f.amountMax));
        return out;
      }}
      columns={productColumns}
      getAmount={(p) => Number(p.purchase_price ?? 0)}
      getCurrency={() => 'AED'}
      nameFilterLabel="Model / brand / serial #"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── 1007/1008 Equipment Gross Cost / Accumulated Depreciation / NBV ───────────
// The existing Assets & Depreciation page already provides this exact per-asset
// detail (same fetchAssetRegister data used by the Depreciation Expense
// drill-down) — linking to it rather than duplicating it here.

export function EquipmentAssetsLinkOut({
  assetsPagePath,
  onClose,
}: {
  assetsPagePath: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="font-bold text-slate-800">Equipment Assets</h2>
        <p className="text-sm text-muted-foreground">
          Per-asset Gross Cost, Accumulated Depreciation, and Net Book Value already have a full
          dedicated view on the Assets &amp; Depreciation page — opening that instead of a duplicate
          list here.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Link href={assetsPagePath}>
            <Button className="gap-2">
              <ExternalLink className="h-4 w-4" /> Open Assets &amp; Depreciation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Node tree builder ─────────────────────────────────────────────────────────

export function buildAssetsTree(assets: {
  currentAssets: {
    cashInHand: { balance: number };
    cashAtBank: { balance: number };
    accountsReceivable: { balance: number };
    securityDepositsReceivable: { balance: number };
    prepaidExpenses: { balance: number };
    sparePartsInventory: { balance: number };
    productInventory: { balance: number };
  };
  nonCurrentAssets: {
    equipmentGrossCost: { balance: number };
    accumulatedDepreciation: { balance: number };
    equipmentNBV: number;
  };
}): DrilldownNode[] {
  const ca = assets.currentAssets;
  return [
    { key: 'CASH_IN_HAND', label: 'Cash in Hand', amount: ca.cashInHand.balance, viewable: true },
    { key: 'CASH_AT_BANK', label: 'Cash at Bank', amount: ca.cashAtBank.balance, viewable: true },
    {
      key: 'ACCOUNTS_RECEIVABLE',
      label: 'Accounts Receivable',
      amount: ca.accountsReceivable.balance,
      viewable: true,
    },
    {
      key: 'SECURITY_DEPOSITS_RECEIVABLE',
      label: 'Security Deposits Receivable',
      amount: ca.securityDepositsReceivable.balance,
      viewable: true,
    },
    {
      key: 'PREPAID_EXPENSES',
      label: 'Prepaid Expenses',
      amount: ca.prepaidExpenses.balance,
      viewable: true,
    },
    {
      key: 'SPARE_PARTS_INVENTORY',
      label: 'Spare Parts Inventory',
      amount: ca.sparePartsInventory.balance,
      viewable: true,
    },
    {
      key: 'PRODUCT_INVENTORY',
      label: 'Product Inventory',
      amount: assets.currentAssets.productInventory.balance,
      viewable: true,
    },
    {
      key: 'EQUIPMENT_ASSETS',
      label: 'Equipment (Gross Cost / Accum. Depreciation / NBV)',
      amount: assets.nonCurrentAssets.equipmentNBV,
      viewable: true,
      note: 'Opens the Assets & Depreciation page — full per-asset detail already lives there',
    },
  ];
}
