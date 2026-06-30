'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  ArrowLeftRight,
  Banknote,
  Building2,
  BookOpen,
  History,
  Pencil,
  PowerOff,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  fetchCashBankAccounts,
  createCashBankAccount,
  updateCashBankAccount,
  deactivateCashBankAccount,
  depositToCashBank,
  withdrawFromCashBank,
  transferBetweenAccounts,
  getCashBankTransactions,
  reconcileAccount,
  getReconciliations,
  fetchCashbookEntries,
  type CashBankAccount,
  type CashBankTransactionEntry,
} from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// ─── Constants ──────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

const CASH_SOURCES = [
  'CASH_RECEIVED_FROM_CUSTOMER',
  'BANK_WITHDRAWAL',
  'OWNER_INJECTION',
  'PETTY_CASH_REIMBURSEMENT',
  'OTHER',
];
const CASH_PURPOSES = [
  'EXPENSE_PAYMENT',
  'BANK_DEPOSIT',
  'VENDOR_PAYMENT',
  'SALARY_ADVANCE',
  'OTHER',
];
const DEPOSIT_SOURCES = [
  'CASH_DEPOSIT',
  'CUSTOMER_PAYMENT_DIRECT',
  'TRANSFER_FROM_OTHER_ACCOUNT',
  'OWNER_DEPOSIT',
  'LOAN_RECEIVED',
  'OTHER',
];
const WITHDRAW_PURPOSES = [
  'CASH_WITHDRAWAL',
  'VENDOR_PAYMENT',
  'SALARY_PAYMENT',
  'EXPENSE_PAYMENT',
  'TRANSFER_TO_OTHER_ACCOUNT',
  'OTHER',
];

const TXN_COLOR: Record<string, string> = {
  RECEIPT: 'text-emerald-600',
  PAYMENT: 'text-red-600',
};

function fmtMoney(amount: number, currency = 'AED') {
  return `${currency} ${Number(amount).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BalanceText({ amount, currency = 'AED' }: { amount: number; currency?: string }) {
  const cls = amount < 0 ? 'text-red-600' : amount === 0 ? 'text-slate-400' : 'text-slate-900';
  return <span className={`font-semibold tabular-nums ${cls}`}>{fmtMoney(amount, currency)}</span>;
}

// ─── Account Modal (Add / Edit) ──────────────────────────────────────────────

interface AccountFormData {
  name: string;
  type: 'CASH' | 'BANK';
  branchId: string;
  currency: string;
  openingBalance: string;
  openingDate: string;
  notes: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  accountType: string;
  contactPerson: string;
}

function AccountModal({
  account,
  defaultType,
  branches,
  onClose,
  onSaved,
}: {
  account?: CashBankAccount | null;
  defaultType?: 'CASH' | 'BANK';
  branches: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!account;
  const [form, setForm] = useState<AccountFormData>({
    name: account?.name ?? '',
    type: account?.type ?? defaultType ?? 'CASH',
    branchId: account?.branchId ?? branches[0]?.id ?? '',
    currency: account?.currency ?? 'AED',
    openingBalance: account?.openingBalance?.toString() ?? '0',
    openingDate: account?.openingDate?.slice(0, 10) ?? today,
    notes: account?.notes ?? '',
    bankName: account?.bankName ?? '',
    accountNumber: account?.accountNumber ?? '',
    iban: account?.iban ?? '',
    accountType: account?.accountType ?? 'CURRENT',
    contactPerson: account?.contactPerson ?? '',
  });

  const set = (k: keyof AccountFormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        branchId: form.branchId,
        currency: form.currency,
        notes: form.notes || undefined,
        ...(form.type === 'BANK' && {
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          iban: form.iban.trim() || undefined,
          accountType: form.accountType as 'CURRENT' | 'SAVINGS' | 'FIXED_DEPOSIT',
          contactPerson: form.contactPerson.trim() || undefined,
        }),
        ...(!isEdit && {
          openingBalance: parseFloat(form.openingBalance) || 0,
          openingDate: form.openingDate,
        }),
      };
      if (isEdit) return updateCashBankAccount(account!.id, payload);
      return createCashBankAccount(payload);
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? 'Account updated'
          : `${form.type === 'CASH' ? 'Cash account' : 'Bank account'} created`,
      );
      onSaved();
      onClose();
    },
    onError: (e: unknown) =>
      toast.error(
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Save failed',
      ),
  });

  const valid =
    form.name.trim().length >= 3 &&
    form.branchId &&
    (form.type === 'CASH' ||
      (form.bankName.trim().length > 0 && form.accountNumber.trim().length > 0));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'Add Account'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {!isEdit && (
            <div>
              <label className="text-sm font-medium text-slate-700">Account Type *</label>
              <div className="flex gap-3 mt-1.5">
                {(['CASH', 'BANK'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set('type', t)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors
                      ${form.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'}`}
                  >
                    {t === 'CASH' ? '💵 Cash in Hand' : '🏦 Cash at Bank'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Account Name *</label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={
                form.type === 'CASH'
                  ? 'e.g. Petty Cash — Dubai Office'
                  : 'e.g. Emirates NBD Operations Account'
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Branch *</label>
              <Select
                value={form.branchId}
                onValueChange={(v) => set('branchId', v)}
                disabled={isEdit}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEdit && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  🔒 Cannot change after creation
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Currency *</label>
              <Select
                value={form.currency}
                onValueChange={(v) => set('currency', v)}
                disabled={isEdit}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED — Dirham</SelectItem>
                  <SelectItem value="QAR">QAR — Qatari Riyal</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                </SelectContent>
              </Select>
              {isEdit && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  🔒 Cannot change after creation
                </p>
              )}
            </div>
          </div>

          {form.type === 'BANK' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Bank Name *</label>
                  <Input
                    className="mt-1"
                    value={form.bankName}
                    onChange={(e) => set('bankName', e.target.value)}
                    placeholder="Emirates NBD, RAKBank..."
                    disabled={isEdit}
                  />
                  {isEdit && <p className="text-xs text-muted-foreground mt-0.5">🔒 Locked</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Account Number *</label>
                  <Input
                    className="mt-1"
                    value={form.accountNumber}
                    onChange={(e) => set('accountNumber', e.target.value)}
                    placeholder="Full account number"
                    disabled={isEdit}
                  />
                  {isEdit && <p className="text-xs text-muted-foreground mt-0.5">🔒 Locked</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">IBAN</label>
                  <Input
                    className="mt-1"
                    value={form.iban}
                    onChange={(e) => set('iban', e.target.value)}
                    placeholder="AE..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Account Type</label>
                  <Select value={form.accountType} onValueChange={(v) => set('accountType', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CURRENT">Current</SelectItem>
                      <SelectItem value="SAVINGS">Savings</SelectItem>
                      <SelectItem value="FIXED_DEPOSIT">Fixed Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Contact Person at Bank</label>
                <Input
                  className="mt-1"
                  value={form.contactPerson}
                  onChange={(e) => set('contactPerson', e.target.value)}
                  placeholder="Relationship manager name"
                />
              </div>
            </>
          )}

          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Opening Balance *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1"
                  value={form.openingBalance}
                  onChange={(e) => set('openingBalance', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Opening Date *</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.openingDate}
                  onChange={(e) => set('openingDate', e.target.value)}
                />
              </div>
            </div>
          )}
          {isEdit && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700">
              Opening Balance:{' '}
              <strong>{fmtMoney(account!.openingBalance, account!.currency)}</strong> — Use
              Add/Withdraw to change current balance.
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={2}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Purpose, notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!valid || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cash Action Modal (Add Cash / Withdraw) ─────────────────────────────────

function CashActionModal({
  account,
  action,
  allAccounts,
  onClose,
  onSaved,
}: {
  account: CashBankAccount;
  action: 'add' | 'withdraw';
  allAccounts: CashBankAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: today,
    amount: '',
    category: '',
    referenceNo: '',
    description: '',
    notes: '',
    linkedAccountId: '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const isAdd = action === 'add';
  const isBankDeposit = !isAdd && form.category === 'BANK_DEPOSIT';

  const mut = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(form.amount);
      if (!amt || amt <= 0) throw new Error('Enter a valid amount');
      if (!isAdd && amt > Number(account.currentBalance)) {
        throw new Error(
          `Insufficient cash. Available: ${fmtMoney(Number(account.currentBalance), account.currency)}`,
        );
      }
      if (isAdd) {
        return depositToCashBank(account.id, {
          date: form.date,
          amount: amt,
          source: form.category || 'OTHER',
          referenceNo: form.referenceNo || undefined,
          description: form.description || 'Cash added',
          notes: form.notes || undefined,
        });
      }
      return withdrawFromCashBank(account.id, {
        date: form.date,
        amount: amt,
        purpose: form.category || 'OTHER',
        referenceNo: form.referenceNo || undefined,
        description: form.description || 'Cash withdrawn',
        notes: form.notes || undefined,
        linkedCashAccountId: isBankDeposit && form.linkedAccountId ? undefined : undefined,
      });
    },
    onSuccess: () => {
      toast.success(
        `${fmtMoney(parseFloat(form.amount || '0'), account.currency)} ${isAdd ? 'added to' : 'withdrawn from'} ${account.name}`,
      );
      onSaved();
      onClose();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : ((e as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Operation failed');
      toast.error(msg);
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAdd ? `Add Cash to ${account.name}` : `Withdraw Cash from ${account.name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground -mt-1 mb-3">
          Current Balance:{' '}
          <strong className="text-slate-800">
            {fmtMoney(Number(account.currentBalance), account.currency)}
          </strong>
        </div>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Date *</label>
              <Input
                type="date"
                className="mt-1"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Amount *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="mt-1"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {!isAdd && form.amount && parseFloat(form.amount) > Number(account.currentBalance) && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              Insufficient cash. Available:{' '}
              {fmtMoney(Number(account.currentBalance), account.currency)}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">
              {isAdd ? 'Source *' : 'Purpose *'}
            </label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(isAdd ? CASH_SOURCES : CASH_PURPOSES).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isBankDeposit && (
            <div>
              <label className="text-sm font-medium text-slate-700">Deposit to Bank Account</label>
              <Select value={form.linkedAccountId} onValueChange={(v) => set('linkedAccountId', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select bank account..." />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts
                    .filter((a) => a.type === 'BANK' && a.isActive)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.bankName})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Reference # (optional)</label>
            <Input
              className="mt-1"
              value={form.referenceNo}
              onChange={(e) => set('referenceNo', e.target.value)}
              placeholder="REF-001"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description *</label>
            <Input
              className="mt-1"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea
              rows={2}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className={`flex-1 text-white ${isAdd ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              disabled={!form.amount || !form.category || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? 'Processing…' : isAdd ? 'Add Cash' : 'Withdraw Cash'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bank Action Modal (Deposit / Withdraw) ──────────────────────────────────

function BankActionModal({
  account,
  action,
  allAccounts,
  onClose,
  onSaved,
}: {
  account: CashBankAccount;
  action: 'deposit' | 'withdraw';
  allAccounts: CashBankAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: today,
    amount: '',
    category: '',
    referenceNo: '',
    chequeNo: '',
    description: '',
    notes: '',
    linkedCashAccountId: '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const isDeposit = action === 'deposit';
  const isCashDeposit = isDeposit && form.category === 'CASH_DEPOSIT';
  const isCashWithdrawal = !isDeposit && form.category === 'CASH_WITHDRAWAL';

  const mut = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(form.amount);
      if (!amt || amt <= 0) throw new Error('Enter a valid amount');
      if (!isDeposit && amt > Number(account.currentBalance)) {
        throw new Error(
          `Insufficient bank balance. Available: ${fmtMoney(Number(account.currentBalance), account.currency)}`,
        );
      }
      if (isDeposit) {
        return depositToCashBank(account.id, {
          date: form.date,
          amount: amt,
          source: form.category || 'OTHER',
          referenceNo: form.referenceNo || undefined,
          description: form.description || 'Bank deposit',
          notes: form.notes || undefined,
          linkedCashAccountId:
            isCashDeposit && form.linkedCashAccountId ? form.linkedCashAccountId : undefined,
        });
      }
      return withdrawFromCashBank(account.id, {
        date: form.date,
        amount: amt,
        purpose: form.category || 'OTHER',
        referenceNo: form.referenceNo || undefined,
        chequeNo: form.chequeNo || undefined,
        description: form.description || 'Bank withdrawal',
        notes: form.notes || undefined,
        linkedCashAccountId:
          isCashWithdrawal && form.linkedCashAccountId ? form.linkedCashAccountId : undefined,
      });
    },
    onSuccess: () => {
      toast.success(
        `${fmtMoney(parseFloat(form.amount || '0'), account.currency)} ${isDeposit ? 'deposited to' : 'withdrawn from'} ${account.name}`,
      );
      onSaved();
      onClose();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : ((e as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Operation failed');
      toast.error(msg);
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDeposit ? `Deposit — ${account.name}` : `Withdraw — ${account.name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground -mt-1 mb-3">
          Bank Balance:{' '}
          <strong className="text-slate-800">
            {fmtMoney(Number(account.currentBalance), account.currency)}
          </strong>
          {account.bankName && (
            <span className="ml-2 text-xs">
              ({account.bankName} ****{account.accountNumber?.slice(-4)})
            </span>
          )}
        </div>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Date *</label>
              <Input
                type="date"
                className="mt-1"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Amount *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="mt-1"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {!isDeposit &&
            form.amount &&
            parseFloat(form.amount) > Number(account.currentBalance) && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                Insufficient balance. Available:{' '}
                {fmtMoney(Number(account.currentBalance), account.currency)}
              </div>
            )}

          <div>
            <label className="text-sm font-medium text-slate-700">
              {isDeposit ? 'Deposit Source *' : 'Withdrawal Purpose *'}
            </label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(isDeposit ? DEPOSIT_SOURCES : WITHDRAW_PURPOSES).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(isCashDeposit || isCashWithdrawal) && (
            <div>
              <label className="text-sm font-medium text-slate-700">
                {isCashDeposit ? 'From Cash Account' : 'To Cash Account'}
              </label>
              <Select
                value={form.linkedCashAccountId}
                onValueChange={(v) => set('linkedCashAccountId', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select cash account (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts
                    .filter((a) => a.type === 'CASH' && a.isActive)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Reference / Txn #</label>
              <Input
                className="mt-1"
                value={form.referenceNo}
                onChange={(e) => set('referenceNo', e.target.value)}
                placeholder="TXN-001"
              />
            </div>
            {!isDeposit && (
              <div>
                <label className="text-sm font-medium text-slate-700">Cheque #</label>
                <Input
                  className="mt-1"
                  value={form.chequeNo}
                  onChange={(e) => set('chequeNo', e.target.value)}
                  placeholder="CHQ-001"
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description *</label>
            <Input
              className="mt-1"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={2}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className={`flex-1 text-white ${isDeposit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              disabled={!form.amount || !form.category || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? 'Processing…' : isDeposit ? 'Record Deposit' : 'Record Withdrawal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transfer Modal ──────────────────────────────────────────────────────────

function TransferModal({
  accounts,
  onClose,
  onSaved,
}: {
  accounts: CashBankAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fromId: '',
    toId: '',
    amount: '',
    date: today,
    referenceNo: '',
    description: '',
    notes: '',
    exchangeRate: '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const fromAcc = accounts.find((a) => a.id === form.fromId);
  const toAcc = accounts.find((a) => a.id === form.toId);
  const differentCurrency = fromAcc && toAcc && fromAcc.currency !== toAcc.currency;

  const mut = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(form.amount);
      if (!amt || amt <= 0) throw new Error('Amount must be positive');
      if (form.fromId === form.toId) throw new Error('From and To accounts must differ');
      if (fromAcc && amt > Number(fromAcc.currentBalance)) {
        throw new Error(
          `Insufficient balance in ${fromAcc.name}. Available: ${fmtMoney(Number(fromAcc.currentBalance), fromAcc.currency)}`,
        );
      }
      return transferBetweenAccounts({
        fromAccountId: form.fromId,
        toAccountId: form.toId,
        amount: amt,
        date: form.date,
        referenceNo: form.referenceNo || undefined,
        description: form.description || 'Account Transfer',
        notes: form.notes || undefined,
        exchangeRate: form.exchangeRate ? parseFloat(form.exchangeRate) : undefined,
      });
    },
    onSuccess: () => {
      toast.success(
        `Transfer of ${fmtMoney(parseFloat(form.amount || '0'), fromAcc?.currency)} completed`,
      );
      onSaved();
      onClose();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : ((e as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Transfer failed');
      toast.error(msg);
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Between Accounts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 pt-1">
          <div>
            <label className="text-sm font-medium text-slate-700">From Account *</label>
            <Select value={form.fromId} onValueChange={(v) => set('fromId', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select source account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.isActive)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {fmtMoney(Number(a.currentBalance), a.currency)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">To Account *</label>
            <Select value={form.toId} onValueChange={(v) => set('toId', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select destination account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.isActive && a.id !== form.fromId)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {differentCurrency && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              ⚠️ Different currencies detected ({fromAcc?.currency} → {toAcc?.currency}). Enter
              exchange rate below.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Date *</label>
              <Input
                type="date"
                className="mt-1"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Amount *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="mt-1"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {differentCurrency && (
            <div>
              <label className="text-sm font-medium text-slate-700">
                Exchange Rate ({fromAcc?.currency} to {toAcc?.currency})
              </label>
              <Input
                type="number"
                step="0.0001"
                className="mt-1"
                value={form.exchangeRate}
                onChange={(e) => set('exchangeRate', e.target.value)}
                placeholder="1.0"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Reference # (optional)</label>
            <Input
              className="mt-1"
              value={form.referenceNo}
              onChange={(e) => set('referenceNo', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description *</label>
            <Input
              className="mt-1"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Transfer purpose..."
            />
          </div>

          {form.amount && fromAcc && parseFloat(form.amount) > Number(fromAcc.currentBalance) && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              Insufficient balance in {fromAcc.name}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!form.fromId || !form.toId || !form.amount || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? 'Processing…' : 'Transfer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transaction History Drawer ───────────────────────────────────────────────

function HistoryDrawer({ account, onClose }: { account: CashBankAccount; onClose: () => void }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['cb-txns', account.id, fromDate, toDate, typeFilter, page],
    queryFn: () =>
      getCashBankTransactions(account.id, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        entryType: typeFilter === 'ALL' ? undefined : typeFilter,
        page,
        limit: 50,
      }),
    staleTime: 30_000,
  });

  const entries: CashBankTransactionEntry[] = data?.entries ?? [];

  const exportExcel = () => {
    const rows = entries.map((e) => ({
      Date: String(e.date).slice(0, 10),
      Ref: e.referenceNo,
      Type: e.entryType,
      Category: e.category,
      Description: e.description,
      Debit: e.entryType === 'PAYMENT' ? Number(e.amount) : 0,
      Credit: e.entryType === 'RECEIPT' ? Number(e.amount) : 0,
      'Running Balance': e.runningBalance,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, account.name.slice(0, 30));
    XLSX.writeFile(wb, `${account.name.replace(/\s+/g, '_')}_history.xlsx`);
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-base">{account.name} — Transaction History</SheetTitle>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
            <span>
              Current Balance:{' '}
              <strong className="text-slate-800">
                {fmtMoney(Number(account.currentBalance), account.currency)}
              </strong>
            </span>
            <span>
              Opening: <strong>{fmtMoney(Number(account.openingBalance), account.currency)}</strong>
            </span>
          </div>
        </SheetHeader>

        <div className="px-6 py-3 border-b shrink-0 flex flex-wrap items-center gap-3">
          <input
            type="date"
            className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="RECEIPT">Receipts</SelectItem>
              <SelectItem value="PAYMENT">Payments</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5 ml-auto" onClick={exportExcel}>
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No transactions found for this filter.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 text-xs uppercase text-slate-500">
                <tr>
                  {['Date', 'Ref', 'Type', 'Description', 'Debit (−)', 'Credit (+)', 'Balance'].map(
                    (h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {String(e.date).slice(0, 10)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {e.referenceNo}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold ${TXN_COLOR[e.entryType]}`}>
                        {e.entryType}
                      </span>
                    </td>
                    <td
                      className="px-4 py-2.5 max-w-[200px] truncate text-slate-700"
                      title={e.description}
                    >
                      {e.description || e.category}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-red-600">
                      {e.entryType === 'PAYMENT'
                        ? fmtMoney(Number(e.amount), account.currency)
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-emerald-600">
                      {e.entryType === 'RECEIPT'
                        ? fmtMoney(Number(e.amount), account.currency)
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-800">
                      {fmtMoney(e.runningBalance, account.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.pages > 1 && (
          <div className="px-6 py-3 border-t shrink-0 flex items-center justify-between text-sm text-slate-600">
            <span>
              {data.total} entries · Page {data.page} of {data.pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Reconcile Modal ──────────────────────────────────────────────────────────

function ReconcileModal({
  account,
  onClose,
  onSaved,
}: {
  account: CashBankAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    reconciliationDate: today,
    statementDate: today,
    statementBalance: '',
    notes: '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const bookBalance = Number(account.currentBalance);
  const stmtBalance = parseFloat(form.statementBalance) || 0;
  const difference = Math.abs(bookBalance - stmtBalance);
  const isBalanced = difference < 0.01;

  const { data: history = [] } = useQuery({
    queryKey: ['reconciliations', account.id],
    queryFn: () => getReconciliations(account.id),
  });

  const mut = useMutation({
    mutationFn: () =>
      reconcileAccount(account.id, {
        reconciliationDate: form.reconciliationDate,
        statementDate: form.statementDate,
        statementBalance: stmtBalance,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Reconciliation saved');
      onSaved();
      onClose();
    },
    onError: () => toast.error('Failed to save reconciliation'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reconcile — {account.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="rounded-xl border p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Book Balance (system)</span>
              <span className="font-semibold">{fmtMoney(bookBalance, account.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Statement Balance</span>
              <span
                className={`font-semibold ${form.statementBalance ? 'text-slate-800' : 'text-slate-400'}`}
              >
                {form.statementBalance ? fmtMoney(stmtBalance, account.currency) : '—'}
              </span>
            </div>
            <hr />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Difference</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {form.statementBalance ? fmtMoney(difference, account.currency) : '—'}
                </span>
                {form.statementBalance && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    {isBalanced ? '✅ BALANCED' : '⚠️ DIFFERENCE'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Reconciliation Date *</label>
              <Input
                type="date"
                className="mt-1"
                value={form.reconciliationDate}
                onChange={(e) => set('reconciliationDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Statement Date *</label>
              <Input
                type="date"
                className="mt-1"
                value={form.statementDate}
                onChange={(e) => set('statementDate', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Statement Balance *</label>
            <Input
              type="number"
              step="0.01"
              className="mt-1"
              value={form.statementBalance}
              onChange={(e) => set('statementBalance', e.target.value)}
              placeholder="Balance from bank statement"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Notes {!isBalanced && '* (explain difference)'}
            </label>
            <textarea
              rows={2}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Explain any difference..."
            />
          </div>

          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">
                Past Reconciliations
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {history.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded px-3 py-1.5"
                  >
                    <span>{String(r.reconciliationDate).slice(0, 10)}</span>
                    <span>{fmtMoney(r.statementBalance, account.currency)}</span>
                    <span className={r.isBalanced ? 'text-emerald-600' : 'text-amber-600'}>
                      {r.isBalanced
                        ? '✅ Balanced'
                        : `⚠️ Diff: ${fmtMoney(r.difference, account.currency)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!form.statementBalance || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? 'Saving…' : 'Save Reconciliation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveTab = 'cash' | 'bank' | 'cashbook' | 'transfer';
type ModalState =
  | { kind: 'add-account'; defaultType: 'CASH' | 'BANK' }
  | { kind: 'edit-account'; account: CashBankAccount }
  | { kind: 'cash-action'; account: CashBankAccount; action: 'add' | 'withdraw' }
  | { kind: 'bank-action'; account: CashBankAccount; action: 'deposit' | 'withdraw' }
  | { kind: 'transfer' }
  | { kind: 'history'; account: CashBankAccount }
  | { kind: 'reconcile'; account: CashBankAccount }
  | null;

export default function CashBankPage() {
  const [tab, setTab] = useState<ActiveTab>('cash');
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const refetchAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['fin-cash-bank'] });
    qc.invalidateQueries({ queryKey: ['fin-cashbook'] });
  }, [qc]);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['fin-cash-bank'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 30_000,
  });

  const { data: cashbookEntries = [], isLoading: loadingCashbook } = useQuery({
    queryKey: ['fin-cashbook'],
    queryFn: () => fetchCashbookEntries({}),
    staleTime: 30_000,
    enabled: tab === 'cashbook' || tab === 'transfer',
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 300_000,
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateCashBankAccount(id),
    onSuccess: () => {
      toast.success('Account deactivated');
      refetchAll();
    },
    onError: (e: unknown) =>
      toast.error(
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Deactivation failed',
      ),
  });

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'CASH' && a.isActive),
    [accounts],
  );
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'BANK' && a.isActive),
    [accounts],
  );
  const activeAccounts = useMemo(() => accounts.filter((a) => a.isActive), [accounts]);

  const totalCash = useMemo(
    () => cashAccounts.reduce((s, a) => s + Number(a.currentBalance), 0),
    [cashAccounts],
  );
  const totalBank = useMemo(
    () => bankAccounts.reduce((s, a) => s + Number(a.currentBalance), 0),
    [bankAccounts],
  );

  const filteredCash = useMemo(
    () =>
      cashAccounts.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase())),
    [cashAccounts, search],
  );

  const filteredBank = useMemo(
    () =>
      bankAccounts.filter(
        (a) =>
          !search ||
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.bankName?.toLowerCase().includes(search.toLowerCase()),
      ),
    [bankAccounts, search],
  );

  const filteredCashbook = useMemo(
    () =>
      cashbookEntries.filter(
        (e) =>
          !search ||
          e.description?.toLowerCase().includes(search.toLowerCase()) ||
          e.referenceNo?.toLowerCase().includes(search.toLowerCase()),
      ),
    [cashbookEntries, search],
  );

  const transferHistory = useMemo(
    () => cashbookEntries.filter((e) => e.category === 'TRANSFER'),
    [cashbookEntries],
  );

  const exportCashbook = () => {
    const rows = filteredCashbook.map((e) => ({
      Date: String(e.date).slice(0, 10),
      Ref: e.referenceNo,
      Type: e.entryType,
      Account: e.account?.name ?? '—',
      Category: e.category,
      Description: e.description,
      Debit: e.entryType === 'PAYMENT' ? Number(e.amount) : 0,
      Credit: e.entryType === 'RECEIPT' ? Number(e.amount) : 0,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Cashbook');
    XLSX.writeFile(wb, `Cashbook_${today}.xlsx`);
  };

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: 'Cash in Hand', icon: <Banknote className="h-4 w-4" /> },
    { id: 'bank', label: 'Cash at Bank', icon: <Building2 className="h-4 w-4" /> },
    { id: 'cashbook', label: 'Cashbook', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'transfer', label: 'Transfers', icon: <ArrowLeftRight className="h-4 w-4" /> },
  ];

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cash & Bank Accounts</h1>
          <p className="text-muted-foreground text-sm">
            {activeAccounts.length} active accounts · {formatCurrency(totalCash + totalBank)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetchAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() =>
              setModal({ kind: 'add-account', defaultType: tab === 'bank' ? 'BANK' : 'CASH' })
            }
          >
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSearch('');
              }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors
                ${tab === t.id ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'cashbook' ? 'Search transactions...' : 'Search accounts...'}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {tab === 'cashbook' && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCashbook}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          )}
          {tab === 'transfer' && (
            <Button
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setModal({ kind: 'transfer' })}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> New Transfer
            </Button>
          )}
        </div>

        {/* Tab content */}
        <div className="bg-white">
          {/* ── Cash in Hand ── */}
          {tab === 'cash' && (
            <>
              <div className="px-4 py-3 bg-emerald-50 border-b flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">
                    Total Cash in Hand
                  </p>
                  <p className="text-2xl font-bold text-emerald-800 mt-0.5">
                    {formatCurrency(totalCash)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">{cashAccounts.length} accounts</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => setModal({ kind: 'add-account', defaultType: 'CASH' })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Cash Account
                </Button>
              </div>
              {isLoading ? (
                <div className="p-8 text-center text-slate-400">Loading…</div>
              ) : filteredCash.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Banknote className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No cash accounts yet</p>
                  <p className="text-sm mt-1">Add your first cash account to track petty cash</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        {[
                          'Account Name',
                          'Branch',
                          'Currency',
                          'Opening Balance',
                          'Current Balance',
                          'Actions',
                        ].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredCash.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                            {a.branchId.slice(0, 8)}…
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-100">
                              {a.currency}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-500">
                            {fmtMoney(Number(a.openingBalance), a.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <BalanceText amount={Number(a.currentBalance)} currency={a.currency} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setModal({ kind: 'cash-action', account: a, action: 'add' })
                                }
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                              >
                                <ArrowDownLeft className="h-3 w-3" /> Add
                              </button>
                              <button
                                onClick={() =>
                                  setModal({ kind: 'cash-action', account: a, action: 'withdraw' })
                                }
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                              >
                                <ArrowUpRight className="h-3 w-3" /> Withdraw
                              </button>
                              <button
                                onClick={() => setModal({ kind: 'history', account: a })}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                                title="History"
                              >
                                <History className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setModal({ kind: 'edit-account', account: a })}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (Number(a.currentBalance) !== 0) {
                                    toast.error(
                                      `Withdraw balance first (${fmtMoney(Number(a.currentBalance), a.currency)} remaining)`,
                                    );
                                    return;
                                  }
                                  if (confirm(`Deactivate "${a.name}"?`))
                                    deactivateMut.mutate(a.id);
                                }}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                                title="Deactivate"
                              >
                                <PowerOff className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Cash at Bank ── */}
          {tab === 'bank' && (
            <>
              <div className="px-4 py-3 bg-blue-50 border-b flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">
                    Total Cash at Bank
                  </p>
                  <p className="text-2xl font-bold text-blue-800 mt-0.5">
                    {formatCurrency(totalBank)}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {bankAccounts.length} bank accounts
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => setModal({ kind: 'add-account', defaultType: 'BANK' })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Bank Account
                </Button>
              </div>
              {isLoading ? (
                <div className="p-8 text-center text-slate-400">Loading…</div>
              ) : filteredBank.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No bank accounts yet</p>
                  <p className="text-sm mt-1">Add your first bank account to track balances</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        {[
                          'Account Name',
                          'Bank',
                          'Account #',
                          'Currency',
                          'Opening',
                          'Current Balance',
                          'Actions',
                        ].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredBank.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                          <td className="px-4 py-3 text-slate-600">{a.bankName ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {a.accountNumber ? `****${a.accountNumber.slice(-4)}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-100">
                              {a.currency}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-500">
                            {fmtMoney(Number(a.openingBalance), a.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <BalanceText amount={Number(a.currentBalance)} currency={a.currency} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setModal({ kind: 'bank-action', account: a, action: 'deposit' })
                                }
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                              >
                                <ArrowDownLeft className="h-3 w-3" /> Deposit
                              </button>
                              <button
                                onClick={() =>
                                  setModal({ kind: 'bank-action', account: a, action: 'withdraw' })
                                }
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                              >
                                <ArrowUpRight className="h-3 w-3" /> Withdraw
                              </button>
                              <button
                                onClick={() => setModal({ kind: 'history', account: a })}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                                title="Statement"
                              >
                                <History className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setModal({ kind: 'reconcile', account: a })}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                                title="Reconcile"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setModal({ kind: 'edit-account', account: a })}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (Number(a.currentBalance) !== 0) {
                                    toast.error(
                                      `Withdraw balance first (${fmtMoney(Number(a.currentBalance), a.currency)} remaining)`,
                                    );
                                    return;
                                  }
                                  if (confirm(`Deactivate "${a.name}"?`))
                                    deactivateMut.mutate(a.id);
                                }}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                                title="Deactivate"
                              >
                                <PowerOff className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Cashbook ── */}
          {tab === 'cashbook' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b bg-slate-50">
                <StatCard
                  title="Total Receipts"
                  value={formatCurrency(
                    cashbookEntries
                      .filter((e) => e.entryType === 'RECEIPT')
                      .reduce((s, e) => s + Number(e.amount), 0),
                  )}
                  subtitle="All time"
                />
                <StatCard
                  title="Total Payments"
                  value={formatCurrency(
                    cashbookEntries
                      .filter((e) => e.entryType === 'PAYMENT')
                      .reduce((s, e) => s + Number(e.amount), 0),
                  )}
                  subtitle="All time"
                />
                <StatCard
                  title="Total Entries"
                  value={cashbookEntries.length.toString()}
                  subtitle="All accounts"
                />
                <StatCard
                  title="Accounts"
                  value={activeAccounts.length.toString()}
                  subtitle="Active"
                />
              </div>
              {loadingCashbook ? (
                <div className="p-8 text-center text-slate-400">Loading…</div>
              ) : filteredCashbook.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No transactions found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0">
                      <tr>
                        {[
                          'Date',
                          'Ref',
                          'Account',
                          'Type',
                          'Category',
                          'Description',
                          'Debit (−)',
                          'Credit (+)',
                        ].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredCashbook.slice(0, 200).map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {String(e.date).slice(0, 10)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                            {e.referenceNo}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 text-xs">
                            {e.account?.name ?? '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-semibold ${TXN_COLOR[e.entryType]}`}>
                              {e.entryType}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{e.category}</td>
                          <td
                            className="px-4 py-2.5 max-w-[160px] truncate text-slate-700"
                            title={e.description}
                          >
                            {e.description}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-red-600 text-right">
                            {e.entryType === 'PAYMENT' ? formatCurrency(Number(e.amount)) : '—'}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-emerald-600 text-right">
                            {e.entryType === 'RECEIPT' ? formatCurrency(Number(e.amount)) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCashbook.length > 200 && (
                    <p className="px-4 py-2.5 text-xs text-slate-400 border-t">
                      Showing 200 of {filteredCashbook.length} entries. Use date range filters on
                      individual account history for full view.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Transfers ── */}
          {tab === 'transfer' && (
            <>
              <div className="p-4 border-b bg-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-800">
                      Transfer between cash & bank accounts
                    </p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      All transfers are atomic — both accounts update simultaneously
                    </p>
                  </div>
                </div>
              </div>
              {loadingCashbook ? (
                <div className="p-8 text-center text-slate-400">Loading…</div>
              ) : transferHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No transfers yet</p>
                  <p className="text-sm mt-1">
                    Use the New Transfer button to move funds between accounts
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        {['Date', 'Reference', 'Account', 'Type', 'Amount', 'Description'].map(
                          (h) => (
                            <th key={h} className="px-4 py-3 text-left font-medium">
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transferHistory.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {String(e.date).slice(0, 10)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {e.referenceNo}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {e.account?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${TXN_COLOR[e.entryType]}`}>
                              {e.entryType}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 tabular-nums font-semibold ${TXN_COLOR[e.entryType]}`}
                          >
                            {e.entryType === 'PAYMENT' ? '−' : '+'}
                            {formatCurrency(Number(e.amount))}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{e.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal?.kind === 'add-account' && (
        <AccountModal
          defaultType={modal.defaultType}
          branches={branches}
          onClose={() => setModal(null)}
          onSaved={refetchAll}
        />
      )}
      {modal?.kind === 'edit-account' && (
        <AccountModal
          account={modal.account}
          branches={branches}
          onClose={() => setModal(null)}
          onSaved={refetchAll}
        />
      )}
      {modal?.kind === 'cash-action' && (
        <CashActionModal
          account={modal.account}
          action={modal.action}
          allAccounts={activeAccounts}
          onClose={() => setModal(null)}
          onSaved={refetchAll}
        />
      )}
      {modal?.kind === 'bank-action' && (
        <BankActionModal
          account={modal.account}
          action={modal.action}
          allAccounts={activeAccounts}
          onClose={() => setModal(null)}
          onSaved={refetchAll}
        />
      )}
      {modal?.kind === 'transfer' && (
        <TransferModal
          accounts={activeAccounts}
          onClose={() => setModal(null)}
          onSaved={refetchAll}
        />
      )}
      {modal?.kind === 'history' && (
        <HistoryDrawer account={modal.account} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'reconcile' && (
        <ReconcileModal
          account={modal.account}
          onClose={() => setModal(null)}
          onSaved={refetchAll}
        />
      )}
    </div>
  );
}
