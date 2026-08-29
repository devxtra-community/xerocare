'use client';

import React from 'react';
import type { DrilldownNode } from './RevenueDrilldown';
import {
  ExpenseLineModal,
  DepreciationModal,
  VendorPurchaseModal,
  EXPENSE_LINE_CATEGORIES,
} from './ExpensesDrilldown';
import {
  AccountsPayableModal,
  AccruedExpensesModal,
  VatPayableModal,
  SecurityDepositsModal,
  DeferredRevenueModal,
  SalaryPayableModal,
} from './LiabilitiesDrilldown';
import { EquityLineModal, RetainedEarningsModal } from './EquityDrilldown';
import { OtherIncomeModal, AccessoriesRevenueModal, UsageRevenueModal } from './IncomeDrilldown';
import {
  CashInHandModal,
  CashAtBankModal,
  AccountsReceivableModal,
  SecurityDepositsReceivableModal,
  PrepaidExpensesModal,
  SparePartsInventoryModal,
  ProductInventoryModal,
  EquipmentAssetsLinkOut,
} from './AssetsDrilldown';

export type DrilldownSection = 'EXPENSE' | 'LIABILITY' | 'EQUITY' | 'ASSET' | 'INCOME';

interface Props {
  section: DrilldownSection;
  node: DrilldownNode;
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  cashBankPagePath?: string;
  assetsPagePath?: string;
  onClose: () => void;
}

// One dispatcher, reused by both the Finance and Admin Chart of Accounts pages —
// maps a clicked node to the correct drill-down modal, all built on the same
// shared DrilldownModal/DrilldownTree pattern from RevenueDrilldown.tsx.
export function LineItemDetailDispatcher({
  section,
  node,
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  cashBankPagePath,
  assetsPagePath,
  onClose,
}: Props) {
  const common = { periodFrom, periodTo, branchId, isAdmin, branches, onClose };

  if (section === 'ASSET') {
    switch (node.key) {
      case 'CASH_IN_HAND':
        return <CashInHandModal {...common} cashBankPagePath={cashBankPagePath ?? '#'} />;
      case 'CASH_AT_BANK':
        return <CashAtBankModal {...common} cashBankPagePath={cashBankPagePath ?? '#'} />;
      case 'ACCOUNTS_RECEIVABLE':
        return <AccountsReceivableModal {...common} cashBankPagePath={cashBankPagePath ?? '#'} />;
      case 'SECURITY_DEPOSITS_RECEIVABLE':
        return (
          <SecurityDepositsReceivableModal {...common} cashBankPagePath={cashBankPagePath ?? '#'} />
        );
      case 'PREPAID_EXPENSES':
        return <PrepaidExpensesModal {...common} cashBankPagePath={cashBankPagePath ?? '#'} />;
      case 'SPARE_PARTS_INVENTORY':
        return <SparePartsInventoryModal {...common} cashBankPagePath={cashBankPagePath ?? '#'} />;
      case 'PRODUCT_INVENTORY':
        return <ProductInventoryModal {...common} cashBankPagePath={cashBankPagePath ?? '#'} />;
      case 'EQUIPMENT_ASSETS':
        return <EquipmentAssetsLinkOut assetsPagePath={assetsPagePath ?? '#'} onClose={onClose} />;
      default:
        return null;
    }
  }

  if (section === 'EXPENSE') {
    if (node.key === 'DEPRECIATION') return <DepreciationModal {...common} />;
    if (node.key === 'VENDOR_PURCHASE_LOCAL')
      return <VendorPurchaseModal origin="DOMESTIC" {...common} />;
    if (node.key === 'VENDOR_PURCHASE_INTL')
      return <VendorPurchaseModal origin="INTERNATIONAL" {...common} />;
    const categories = EXPENSE_LINE_CATEGORIES[node.key];
    if (categories)
      return <ExpenseLineModal categories={categories} title={node.label} {...common} />;
    return null;
  }

  if (section === 'LIABILITY') {
    switch (node.key) {
      case 'ACCOUNTS_PAYABLE':
        return <AccountsPayableModal {...common} />;
      case 'ACCRUED_EXPENSES':
        return <AccruedExpensesModal {...common} />;
      case 'VAT_PAYABLE':
        return <VatPayableModal {...common} />;
      case 'SECURITY_DEPOSITS':
        return <SecurityDepositsModal {...common} />;
      case 'DEFERRED_REVENUE':
        return <DeferredRevenueModal {...common} />;
      case 'SALARY_PAYABLE':
        return <SalaryPayableModal {...common} />;
      default:
        return null;
    }
  }

  if (section === 'INCOME') {
    if (node.key === 'OTHER_INCOME') return <OtherIncomeModal {...common} />;
    if (node.key === 'ACCESSORIES_REVENUE') return <AccessoriesRevenueModal {...common} />;
    if (node.key === 'USAGE_REVENUE') return <UsageRevenueModal {...common} />;
    return null;
  }

  if (section === 'EQUITY') {
    switch (node.key) {
      case 'OWNER_CAPITAL':
        return (
          <EquityLineModal
            types={['SHARE_CAPITAL', 'OWNER_CONTRIBUTION', 'OPENING_BALANCE_EQUITY']}
            title="Owner's Capital"
            {...common}
          />
        );
      case 'RETAINED_EARNINGS':
        return <RetainedEarningsModal onClose={onClose} />;
      case 'RESERVES':
        return <EquityLineModal types={['RESERVES']} title="Reserves" {...common} />;
      case 'WITHDRAWALS':
        return <EquityLineModal types={['WITHDRAWAL']} title="Withdrawals" {...common} />;
      case 'DIVIDENDS':
        return <EquityLineModal types={['DIVIDEND']} title="Dividends" {...common} />;
      default:
        return null;
    }
  }

  return null;
}
