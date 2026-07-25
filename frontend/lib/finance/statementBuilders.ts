import { formatCurrency } from '@/lib/format';
import type { AccountBalance, ChartOfAccountsResponse } from './accountsApi';
import type { SnapshotSection, SnapshotStatementData } from '@/components/shared/StatementDialog';

/**
 * Converts the Chart of Accounts API response into the generic whole-page
 * snapshot statement shape — one shared builder so the Finance and Admin
 * Chart of Accounts pages both feed the same StatementDialog identically,
 * rather than each page assembling its own document layout.
 */
export function buildChartOfAccountsStatement(
  data: ChartOfAccountsResponse,
  currency: string,
): SnapshotStatementData {
  const row = (ab: AccountBalance) => ({
    code: ab.code,
    label: ab.name,
    value: formatCurrency(ab.balance, currency),
  });
  const customRows = (accounts: { code: string; name: string; balance: number }[]) =>
    accounts.map((a) => ({
      code: a.code,
      label: a.name,
      value: formatCurrency(a.balance, currency),
    }));

  const sections: SnapshotSection[] = [
    {
      title: 'Assets — Current',
      rows: [
        row(data.assets.currentAssets.cashInHand),
        row(data.assets.currentAssets.cashAtBank),
        row(data.assets.currentAssets.accountsReceivable),
        row(data.assets.currentAssets.securityDepositsReceivable),
        row(data.assets.currentAssets.prepaidExpenses),
        row(data.assets.currentAssets.sparePartsInventory),
        row(data.assets.currentAssets.productInventory),
        ...customRows(data.assets.currentAssets.custom),
      ],
      total: {
        label: 'Total Current Assets',
        value: formatCurrency(data.assets.currentAssets.totalCurrentAssets, currency),
      },
    },
    {
      title: 'Assets — Non-Current',
      rows: [
        row(data.assets.nonCurrentAssets.equipmentGrossCost),
        row(data.assets.nonCurrentAssets.accumulatedDepreciation),
        {
          label: 'Equipment Net Book Value',
          value: formatCurrency(data.assets.nonCurrentAssets.equipmentNBV, currency),
        },
        ...customRows(data.assets.nonCurrentAssets.custom),
      ],
      total: {
        label: 'Total Non-Current Assets',
        value: formatCurrency(data.assets.nonCurrentAssets.totalNonCurrentAssets, currency),
      },
    },
    {
      title: 'Liabilities',
      rows: [
        row(data.liabilities.currentLiabilities.accountsPayable),
        row(data.liabilities.currentLiabilities.accruedExpenses),
        row(data.liabilities.currentLiabilities.vatPayable),
        row(data.liabilities.currentLiabilities.securityDepositsReceived),
        row(data.liabilities.currentLiabilities.deferredRevenue),
        row(data.liabilities.currentLiabilities.salaryPayable),
        ...customRows(data.liabilities.currentLiabilities.custom),
        ...customRows(data.liabilities.nonCurrentLiabilities.custom),
      ],
      total: {
        label: 'Total Liabilities',
        value: formatCurrency(data.liabilities.totalLiabilities, currency),
      },
    },
    {
      title: 'Equity',
      rows: [
        row(data.equity.ownerCapital),
        row(data.equity.retainedEarnings),
        row(data.equity.reserves),
        row(data.equity.lessWithdrawals),
        row(data.equity.lessDividends),
        ...customRows(data.equity.custom),
      ],
      total: { label: 'Total Equity', value: formatCurrency(data.equity.totalEquity, currency) },
    },
    {
      title: 'Income / Revenue',
      rows: [
        row(data.income.rentalRevenue),
        row(data.income.leaseRevenue),
        row(data.income.salesRevenue),
        row(data.income.serviceRevenue),
        row(data.income.usageRevenue),
        row(data.income.amcSmaRevenue),
        row(data.income.sparePartSales),
        row(data.income.otherIncome),
        ...customRows(data.income.custom),
      ],
      total: { label: 'Total Income', value: formatCurrency(data.income.totalIncome, currency) },
    },
    {
      title: 'Expenses',
      rows: [
        row(data.expenses.costOfParts),
        row(data.expenses.labourCost),
        row(data.expenses.depreciation),
        row(data.expenses.vendorPurchases),
        row(data.expenses.shippingHandling),
        row(data.expenses.salaryExpense),
        row(data.expenses.travelExpense),
        row(data.expenses.rentExpense),
        row(data.expenses.utilitiesExpense),
        row(data.expenses.marketingExpense),
        row(data.expenses.maintenanceExpense),
        row(data.expenses.insuranceExpense),
        row(data.expenses.importLabourCost),
        row(data.expenses.customsDuty),
        row(data.expenses.otherExpenses),
        ...customRows(data.expenses.custom),
      ],
      total: {
        label: 'Total Expenses',
        value: formatCurrency(data.expenses.totalExpenses, currency),
      },
    },
  ];

  return {
    kind: 'snapshot',
    title: 'Chart of Accounts',
    periodFrom: data.periodFrom,
    periodTo: data.periodTo,
    asOfDate: data.asOfDate,
    sections,
    summary: [
      { label: 'Total Assets', value: formatCurrency(data.assets.totalAssets, currency) },
      {
        label: 'Total Liabilities + Equity',
        value: formatCurrency(data.summary.accountingEquation.totalLiabilitiesPlusEquity, currency),
      },
      { label: 'Gross Profit', value: formatCurrency(data.summary.grossProfit, currency) },
      {
        label: data.summary.accountingEquation.isBalanced ? 'Balanced ✓' : 'Net Profit',
        value: formatCurrency(data.summary.netProfit, currency),
        bold: true,
      },
    ],
  };
}
