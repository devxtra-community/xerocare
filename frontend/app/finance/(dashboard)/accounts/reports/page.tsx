'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Scale,
  Waves,
  ReceiptText,
  CreditCard,
  Package,
  Receipt,
  BookMarked,
  BookOpen,
  PieChart,
  Download,
  ExternalLink,
  BarChart2,
} from 'lucide-react';
import {
  getDateRangeForPeriod,
  fetchAllInvoices,
  fetchARInvoices,
  fetchPurchases,
  fetchPayroll,
  fetchProducts,
  depreciationStraightLine,
  type InvoiceSummary,
  type PurchaseOrder,
  type PayrollRecord,
  type ProductAsset,
} from '@/lib/finance/accounts';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';

type Period = 'month' | 'quarter' | 'year' | 'custom';

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  slate: 'bg-slate-50 border-slate-200 text-slate-700',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  pink: 'bg-pink-50 border-pink-200 text-pink-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
};

export default function ReportsHubPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const { from, to } = React.useMemo(
    () => getDateRangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const exportARAging = async () => {
    const invoices: InvoiceSummary[] = await fetchARInvoices({ fromDate: from, toDate: to });
    const today = new Date();
    const rows = invoices.map((inv) => {
      const due = inv.dueDate ? new Date(inv.dueDate) : null;
      const diff = due ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0;
      const bucket =
        diff <= 0
          ? 'Current'
          : diff <= 30
            ? '1-30 days'
            : diff <= 60
              ? '31-60 days'
              : diff <= 90
                ? '61-90 days'
                : '90+ days';
      return {
        'Invoice #': inv.invoiceNumber,
        Customer: inv.customerName,
        'Contract Type': inv.saleType,
        'Invoice Date': inv.createdAt?.slice(0, 10),
        'Due Date': inv.dueDate?.slice(0, 10) ?? '',
        Total: inv.totalAmount,
        Paid: inv.paidAmount ?? 0,
        Outstanding: inv.totalAmount - (inv.paidAmount ?? 0),
        'Aging Bucket': bucket,
        Currency: inv.currency,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AR Aging');
    XLSX.writeFile(wb, `AR_Aging_${from}_${to}.xlsx`);
  };

  const exportAPAging = async () => {
    const purchases: PurchaseOrder[] = await fetchPurchases({ fromDate: from, toDate: to });
    const rows = purchases.map((p) => ({
      'PO #': p.id,
      Vendor: p.vendorName,
      'PO Date': p.createdAt?.slice(0, 10),
      'Total Cost': p.totalCost,
      Labour: p.labour ?? 0,
      Shipping: (p.shipping ?? 0) + (p.handling ?? 0),
      Currency: p.currency,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AP Aging');
    XLSX.writeFile(wb, `AP_Aging_${from}_${to}.xlsx`);
  };

  const exportDepreciationSchedule = async () => {
    const products: ProductAsset[] = await fetchProducts();
    const rows = products.map((p) => {
      const months = Math.max(
        0,
        (new Date().getFullYear() - new Date(p.createdAt).getFullYear()) * 12 +
          new Date().getMonth() -
          new Date(p.createdAt).getMonth(),
      );
      const dep = depreciationStraightLine({ cost: 15000, monthsElapsed: months });
      return {
        'Serial Number': p.serialNumber,
        Model: p.modelName,
        Brand: p.brandName,
        'Purchase Date': p.createdAt?.slice(0, 10),
        'Cost (AED)': 15000,
        'Useful Life (mo)': 60,
        'Months Elapsed': months,
        'Monthly Dep': dep.monthly.toFixed(2),
        'Accumulated Dep': dep.accumulated.toFixed(2),
        'Net Book Value': dep.netBookValue.toFixed(2),
        Status: p.status,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Depreciation Schedule');
    XLSX.writeFile(wb, `Depreciation_Schedule_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportVATReport = async () => {
    const invoices: InvoiceSummary[] = await fetchARInvoices({ fromDate: from, toDate: to });
    const purchases: PurchaseOrder[] = await fetchPurchases({ fromDate: from, toDate: to });
    const outputRows = invoices
      .filter((i) => (i.taxAmount ?? 0) > 0)
      .map((i) => ({
        Reference: i.invoiceNumber,
        Party: i.customerName,
        Date: i.createdAt?.slice(0, 10),
        'Taxable Amount': i.totalAmount - (i.taxAmount ?? 0),
        'VAT %': '5',
        'VAT Amount': i.taxAmount ?? 0,
        Currency: i.currency,
        Type: 'Output',
      }));
    const inputRows = purchases.map((p) => ({
      Reference: p.id?.slice(0, 8),
      Party: p.vendorName,
      Date: p.createdAt?.slice(0, 10),
      'Taxable Amount': p.totalCost,
      'VAT %': '5',
      'VAT Amount': p.totalCost * 0.05,
      Currency: p.currency ?? 'AED',
      Type: 'Input',
    }));
    const ws = XLSX.utils.json_to_sheet([...outputRows, ...inputRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VAT Report');
    XLSX.writeFile(wb, `VAT_Report_${from}_${to}.xlsx`);
  };

  const exportIncomeStatement = async () => {
    const REVENUE_STATUSES = new Set([
      'PAID',
      'PARTIAL',
      'ACTIVE_CONTRACT',
      'ACTIVE_LEASE',
      'INVOICED',
      'FINAL',
      'TRANSACTION_COMPLETED',
    ]);
    const invoices: InvoiceSummary[] = (await fetchAllInvoices()).filter((i) => {
      const d = i.createdAt?.slice(0, 10) ?? '';
      return REVENUE_STATUSES.has(i.status) && (!from || d >= from) && (!to || d <= to);
    });
    const payroll: PayrollRecord[] = await fetchPayroll();
    const purchases: PurchaseOrder[] = await fetchPurchases({ fromDate: from, toDate: to });
    const products: ProductAsset[] = await fetchProducts();
    const rev = (type: string) => {
      const types = type === 'SALE' ? ['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'] : [type];
      return invoices
        .filter((i) => types.includes(i.saleType))
        .reduce((s, i) => s + i.totalAmount, 0);
    };
    const [rentalRev, leaseRev, salesRev, serviceRev, usageRev, amcRev] = [
      'RENT',
      'LEASE',
      'SALE',
      'SERVICE',
      'USAGE',
      'AMC',
    ].map(rev);
    const totalRev = rentalRev + leaseRev + salesRev + serviceRev + usageRev + amcRev;
    const labourCost = purchases.reduce((s, p) => s + (p.labour ?? 0), 0);
    const salaries = payroll.reduce((s, p) => s + p.netSalary, 0);
    const vendorCost = purchases.reduce(
      (s, p) => s + ((p.totalCost ?? 0) - (p.shipping ?? 0) - (p.handling ?? 0) - (p.labour ?? 0)),
      0,
    );
    const shipping = purchases.reduce((s, p) => s + (p.shipping ?? 0) + (p.handling ?? 0), 0);
    const now = new Date();
    const dep = products.reduce((sum, p) => {
      const months = Math.max(
        0,
        (now.getFullYear() - new Date(p.createdAt).getFullYear()) * 12 +
          now.getMonth() -
          new Date(p.createdAt).getMonth(),
      );
      return sum + depreciationStraightLine({ cost: 15000, monthsElapsed: months }).monthly;
    }, 0);
    const totalOpEx = salaries + vendorCost + shipping + dep;
    const tax = invoices.reduce((s, i) => s + (i.taxAmount ?? 0), 0);
    const rows = [
      ['INCOME STATEMENT', '', `${from} to ${to}`],
      [],
      ['REVENUE'],
      ['Rental Revenue', rentalRev],
      ['Lease Revenue', leaseRev],
      ['Sales Revenue', salesRev],
      ['Service Revenue', serviceRev],
      ['TOTAL REVENUE', totalRev],
      [],
      ['COST OF REVENUE'],
      ['Labour Cost', labourCost],
      ['GROSS PROFIT', totalRev - labourCost],
      [],
      ['OPERATING EXPENSES'],
      ['Salary Expense', salaries],
      ['Vendor Purchase Cost', vendorCost],
      ['Shipping & Handling', shipping],
      ['Depreciation', dep],
      ['TOTAL OPEX', totalOpEx],
      [],
      ['NET PROFIT', totalRev - labourCost - totalOpEx - tax],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');
    XLSX.writeFile(wb, `Income_Statement_${from}_${to}.xlsx`);
  };

  const exportTrialBalance = async () => {
    const invoices: InvoiceSummary[] = await fetchAllInvoices();
    const purchases: PurchaseOrder[] = await fetchPurchases({ fromDate: from, toDate: to });
    const payroll: PayrollRecord[] = await fetchPayroll();
    type TBEntry = { debit: number; credit: number };
    const tb: Record<string, TBEntry> = {};
    const add = (acc: string, debit: number, credit: number) => {
      if (!tb[acc]) tb[acc] = { debit: 0, credit: 0 };
      tb[acc].debit += debit;
      tb[acc].credit += credit;
    };
    invoices.forEach((inv) => {
      const revAcc =
        inv.saleType === 'RENT'
          ? '4001 Rental Revenue'
          : inv.saleType === 'LEASE'
            ? '4002 Lease Revenue'
            : '4003 Sales Revenue';
      add('1003 Accounts Receivable', inv.totalAmount, 0);
      add(revAcc, 0, inv.totalAmount);
      if ((inv.taxAmount ?? 0) > 0) add('2003 VAT / Tax Payable', 0, inv.taxAmount ?? 0);
      if ((inv.paidAmount ?? 0) > 0) {
        add('1002 Cash at Bank', inv.paidAmount ?? 0, 0);
        add('1003 Accounts Receivable', 0, inv.paidAmount ?? 0);
      }
    });
    purchases.forEach((p) => {
      add(
        '5004 Vendor Purchase Cost',
        p.totalCost - (p.shipping ?? 0) - (p.handling ?? 0) - (p.labour ?? 0),
        0,
      );
      add('2001 Accounts Payable', 0, p.totalCost);
      if ((p.shipping ?? 0) + (p.handling ?? 0) > 0)
        add('5005 Shipping & Handling', (p.shipping ?? 0) + (p.handling ?? 0), 0);
      if ((p.labour ?? 0) > 0) add('5002 Technician Labour Cost', p.labour ?? 0, 0);
    });
    payroll.forEach((p) => {
      add('5006 Employee Salary Expense', p.netSalary ?? 0, 0);
      add('1002 Cash at Bank', 0, p.netSalary ?? 0);
    });
    const rows = [
      ['TRIAL BALANCE', '', `As of ${to}`, ''],
      ['Account', 'Debit', 'Credit', 'Net Balance'],
      ...Object.entries(tb)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([acc, { debit, credit }]) => [
          acc,
          debit.toFixed(2),
          credit.toFixed(2),
          (debit - credit).toFixed(2),
        ]),
      [],
      [
        'TOTALS',
        Object.values(tb)
          .reduce((s, e) => s + e.debit, 0)
          .toFixed(2),
        Object.values(tb)
          .reduce((s, e) => s + e.credit, 0)
          .toFixed(2),
        '',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
    XLSX.writeFile(wb, `Trial_Balance_${to}.xlsx`);
  };

  const handleExport = async (id: string, fn: () => Promise<void>) => {
    setLoading(id);
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const reports = [
    {
      id: 'income',
      title: 'Income Statement (P&L)',
      description: 'Revenue, gross profit, operating expenses, and net profit for the period.',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'emerald',
      href: '/finance/accounts/income-statement',
      exportFn: exportIncomeStatement,
    },
    {
      id: 'balance',
      title: 'Balance Sheet',
      description: 'Assets, liabilities, and equity position as of a selected date.',
      icon: <Scale className="h-5 w-5" />,
      color: 'blue',
      href: '/finance/accounts/balance-sheet',
    },
    {
      id: 'cashflow',
      title: 'Cash Flow Statement',
      description: 'Operating, investing, and financing cash movements.',
      icon: <Waves className="h-5 w-5" />,
      color: 'indigo',
      href: '/finance/accounts/cash-flow',
    },
    {
      id: 'ar',
      title: 'AR Aging Report',
      description: 'Customer outstanding balances bucketed by overdue days.',
      icon: <ReceiptText className="h-5 w-5" />,
      color: 'orange',
      href: '/finance/accounts/receivable',
      exportFn: exportARAging,
    },
    {
      id: 'ap',
      title: 'AP Aging Report',
      description: 'Vendor purchase orders and outstanding payables.',
      icon: <CreditCard className="h-5 w-5" />,
      color: 'amber',
      href: '/finance/accounts/payable',
      exportFn: exportAPAging,
    },
    {
      id: 'dep',
      title: 'Asset Depreciation Schedule',
      description: 'Full printer equipment register with monthly depreciation.',
      icon: <Package className="h-5 w-5" />,
      color: 'purple',
      href: '/finance/accounts/assets',
      exportFn: exportDepreciationSchedule,
    },
    {
      id: 'vat',
      title: 'VAT Report',
      description: 'Output tax collected vs. input tax paid — net VAT payable.',
      icon: <Receipt className="h-5 w-5" />,
      color: 'red',
      href: '/finance/accounts/tax',
      exportFn: exportVATReport,
    },
    {
      id: 'gl',
      title: 'General Ledger Export',
      description: 'All debit/credit entries across every account head.',
      icon: <BookMarked className="h-5 w-5" />,
      color: 'slate',
      href: '/finance/accounts/general-ledger',
    },
    {
      id: 'coa',
      title: 'Chart of Accounts',
      description: 'Master list of all account heads with codes and balances.',
      icon: <BookOpen className="h-5 w-5" />,
      color: 'teal',
      href: '/finance/accounts/chart-of-accounts',
    },
    {
      id: 'exp',
      title: 'Expense Report',
      description: 'Categorized breakdown of all outgoing costs.',
      icon: <PieChart className="h-5 w-5" />,
      color: 'pink',
      href: '/finance/accounts/expenses',
    },
    {
      id: 'tb',
      title: 'Trial Balance',
      description: 'Debit and credit totals per account — confirms double-entry integrity.',
      icon: <BarChart2 className="h-5 w-5" />,
      color: 'violet',
      href: '/finance/accounts/general-ledger',
      exportFn: exportTrialBalance,
    },
  ];

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Financial Reports Hub</h3>
        <p className="text-muted-foreground">
          Generate and download all financial reports in one place
        </p>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-3 bg-card rounded-xl p-4 border border-slate-100 shadow-sm">
        <span className="text-sm font-medium text-slate-700">Report Period:</span>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-44 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        {period === 'custom' && (
          <>
            <input
              type="date"
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {from} → {to}
        </span>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl bg-card shadow-sm border border-slate-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl border ${COLOR_MAP[r.color] ?? ''}`}>{r.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-800 leading-tight">{r.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {r.description}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => router.push(r.href)}
              >
                <ExternalLink className="h-3 w-3" /> View Report
              </Button>
              {r.exportFn && (
                <Button
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loading === r.id}
                  onClick={() => handleExport(r.id, r.exportFn!)}
                >
                  {loading === r.id ? (
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Excel
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        All reports use live data from connected services. Excel exports are generated client-side.
      </p>
    </div>
  );
}
