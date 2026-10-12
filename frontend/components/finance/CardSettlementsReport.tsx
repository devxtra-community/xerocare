'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, Search, Landmark } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { GCC_COUNTRIES, CARD_NETWORK_LABEL, CardNetwork } from '@/lib/payments/gccCards';
import StatCard from '@/components/StatCard';
import { fetchCashBankAccounts } from '@/lib/finance/accountsApi';
import { getApiErrorMessage } from '@/lib/apiError';

/**
 * Card settlement reconciliation.
 *
 * The acquirer deposits one lump sum per batch, not one deposit per sale, so the useful
 * question is "which receipts add up to this bank line?". The day grouping answers that
 * directly; the transaction list underneath explains any day that does not tie out.
 */

interface SettlementRow {
  id: string;
  transactionDate: string;
  gross: string | number;
  commission: string | number;
  ratePercent: string | number | null;
  net: string | number | null;
  cardType?: string;
  cardNetwork?: string;
  issuerCountry?: string;
  issuerBank?: string;
  cardLast4?: string;
  cardHolderName?: string;
  transactionReference?: string;
  currency?: string;
  invoiceNumber: string;
  isDirectSale?: boolean;
}

interface Totals {
  gross: number;
  commission: number;
  net: number;
  count: number;
}
interface DayRow {
  date: string;
  gross: number;
  commission: number;
  net: number;
  count: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export default function CardSettlementsReport() {
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [cardType, setCardType] = useState('');
  const [cardNetwork, setCardNetwork] = useState('');
  const [issuerCountry, setIssuerCountry] = useState('');
  const [search, setSearch] = useState('');
  const [bankAccounts, setBankAccounts] = useState<
    { id: string; name: string; isDefault?: boolean }[]
  >([]);
  const [settlementAccountId, setSettlementAccountId] = useState('');
  const [settlementRate, setSettlementRate] = useState('');
  const [commissionPromptFor, setCommissionPromptFor] = useState<SettlementRow | null>(null);
  const [commissionPromptMode, setCommissionPromptMode] = useState<'PERCENTAGE' | 'AMOUNT'>(
    'PERCENTAGE',
  );
  const [commissionPromptValue, setCommissionPromptValue] = useState('');
  const [processingId, setProcessingId] = useState('');
  const currency = useMemo(() => rows[0]?.currency ?? 'AED', [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/b/card-fees/settlements', {
        params: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          cardType: cardType || undefined,
          cardNetwork: cardNetwork || undefined,
          issuerCountry: issuerCountry || undefined,
          search: search || undefined,
        },
      });
      const d = res.data?.data ?? {};
      setRows(d.transactions ?? []);
      setTotals(d.totals ?? null);
      setDays(d.bySettlementDate ?? []);
    } catch {
      toast.error('Could not load card settlements');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, cardType, cardNetwork, issuerCountry, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetchCashBankAccounts()
      .then((accounts) => {
        const activeBanks = accounts
          .filter((a) => a.type === 'BANK' && a.isActive)
          .map((a) => ({ id: a.id, name: a.name, isDefault: a.isDefault }));
        setBankAccounts(activeBanks);

        // A configured default account is the intended settlement destination. If
        // there is only one active bank account, choosing it avoids leaving Process
        // disabled for the common single-account setup.
        const preferred =
          activeBanks.find((a) => a.isDefault) ??
          (activeBanks.length === 1 ? activeBanks[0] : undefined);
        if (preferred) setSettlementAccountId((current) => current || preferred.id);
      })
      .catch(() => undefined);
  }, []);

  const processSettlement = async (
    transactionId: string,
    override?: { mode: 'PERCENTAGE' | 'AMOUNT'; value: string },
  ) => {
    if (!settlementAccountId) {
      toast.error('Select the bank account for settlement');
      return;
    }
    const commissionOverride =
      override ??
      (settlementRate !== '' ? { mode: 'PERCENTAGE' as const, value: settlementRate } : undefined);
    setProcessingId(transactionId);
    try {
      await api.post(
        '/b/card-fees/settlements/process-direct-sale',
        {
          transactionId,
          cashAccountId: settlementAccountId,
          ...(commissionOverride?.mode === 'PERCENTAGE'
            ? { commissionRatePercent: Number(commissionOverride.value) }
            : {}),
          ...(commissionOverride?.mode === 'AMOUNT'
            ? { commissionAmount: Number(commissionOverride.value) }
            : {}),
        },
        { skipErrorToast: true },
      );
      setCommissionPromptFor(null);
      toast.success('Card settlement processed');
      await load();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Could not process card settlement');
      if (
        !commissionOverride &&
        message.toLowerCase().includes('no commission rule is configured')
      ) {
        const row = rows.find((candidate) => candidate.id === transactionId) ?? null;
        setCommissionPromptMode('PERCENTAGE');
        setCommissionPromptValue('');
        setCommissionPromptFor(row);
      } else {
        toast.error(message);
      }
    } finally {
      setProcessingId('');
    }
  };

  const confirmCommissionRate = () => {
    const value = Number(commissionPromptValue);
    const gross = Number(commissionPromptFor?.gross ?? 0);
    if (
      !commissionPromptValue.trim() ||
      !Number.isFinite(value) ||
      value < 0 ||
      (commissionPromptMode === 'PERCENTAGE' && value > 100) ||
      (commissionPromptMode === 'AMOUNT' && value > gross)
    ) {
      toast.error(
        commissionPromptMode === 'PERCENTAGE'
          ? 'Enter a commission percentage between 0 and 100'
          : 'Commission amount cannot exceed the gross payment',
      );
      return;
    }
    if (commissionPromptFor) {
      void processSettlement(commissionPromptFor.id, {
        mode: commissionPromptMode,
        value: commissionPromptValue,
      });
    }
  };

  const promptGross = Number(commissionPromptFor?.gross ?? 0);
  const promptInput = Number(commissionPromptValue);
  const promptCommission =
    commissionPromptValue.trim() && Number.isFinite(promptInput)
      ? commissionPromptMode === 'PERCENTAGE'
        ? (promptGross * promptInput) / 100
        : promptInput
      : null;
  const promptCurrency = commissionPromptFor?.currency ?? currency;
  const promptMoney = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: promptCurrency,
  });
  const promptCommissionRounded =
    promptCommission === null
      ? null
      : Number(promptCommission.toFixed(promptMoney.resolvedOptions().maximumFractionDigits));

  const fmt = (n: number | string | null | undefined) =>
    Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-medium text-foreground">
          <Landmark size={20} className="text-primary" />
          Card Settlements
        </h1>
        <p className="mt-1 max-w-3xl text-xs font-medium text-muted-foreground">
          What customers paid by card, what the acquirer&apos;s commission took, and what should
          therefore have reached the bank. Group totals are per settlement day, so a single deposit
          on the bank statement can be matched to the receipts behind it.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <div className="min-w-56">
          <Label className="text-[10px] font-black uppercase text-muted-foreground">
            Settlement bank account
          </Label>
          <Select value={settlementAccountId} onValueChange={setSettlementAccountId}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue
                placeholder={bankAccounts.length ? 'Select bank account' : 'No active bank account'}
              />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label className="text-[10px] font-black uppercase text-muted-foreground">
            Optional commission %
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.0001"
            className="mt-1 h-9"
            value={settlementRate}
            onChange={(e) => setSettlementRate(e.target.value)}
            placeholder="Use configured rate"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Applies when processing a Direct Sale card receipt with no configured rate.
        </p>
        {!settlementAccountId && (
          <p className="w-full text-xs text-amber-700">
            {bankAccounts.length
              ? 'Select a settlement bank account to enable Process.'
              : 'Add or activate a bank account in Cash & Bank to process card settlements.'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted p-4 md:grid-cols-6">
        <div>
          <Label className="text-[10px] font-black uppercase text-muted-foreground">From</Label>
          <Input
            type="date"
            className="mt-1 h-9"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-muted-foreground">To</Label>
          <Input
            type="date"
            className="mt-1 h-9"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-muted-foreground">
            Card Type
          </Label>
          <Select
            value={cardType || 'ALL'}
            onValueChange={(v) => setCardType(v === 'ALL' ? '' : v)}
          >
            <SelectTrigger className="mt-1 h-9 bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* "" is how Radix represents "nothing selected" and is rejected as an
                  item value, so the all-filter travels as ALL and maps back to "". */}
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="DEBIT">Debit</SelectItem>
              <SelectItem value="CREDIT">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-muted-foreground">Network</Label>
          <Select
            value={cardNetwork || 'ALL'}
            onValueChange={(v) => setCardNetwork(v === 'ALL' ? '' : v)}
          >
            <SelectTrigger className="mt-1 h-9 bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {(Object.keys(CARD_NETWORK_LABEL) as CardNetwork[]).map((n) => (
                <SelectItem key={n} value={n}>
                  {CARD_NETWORK_LABEL[n]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-muted-foreground">Country</Label>
          <Select
            value={issuerCountry || 'ALL'}
            onValueChange={(v) => setIssuerCountry(v === 'ALL' ? '' : v)}
          >
            <SelectTrigger className="mt-1 h-9 bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {GCC_COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-muted-foreground">Search</Label>
          <div className="relative mt-1">
            <Search
              size={13}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-9 pl-7"
              placeholder="Bank, invoice, ref, ••••1234"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {totals && (
        /* The shared StatCard the Rent, Quotations, Receipts and Installation pages use.
           The red/green on the last two is the one thing this strip needs that a plain
           StatCard could not say, which is why StatCard now takes a `tone`: fees are
           money leaving, net is money landing. */
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
          <StatCard
            title="Card Receipts"
            value={String(totals.count)}
            subtitle="Card payments in range"
          />
          <StatCard
            title="Gross Collected"
            value={`${currency} ${fmt(totals.gross)}`}
            subtitle="What customers paid"
          />
          <StatCard
            title="Processing Fees"
            value={`${currency} ${fmt(totals.commission)}`}
            subtitle="Acquirer commission"
            tone="negative"
          />
          <StatCard
            title="Net to Bank"
            value={`${currency} ${fmt(totals.net)}`}
            subtitle="Should reach the bank"
            tone="positive"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading settlements…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted p-10 text-center">
          <CreditCard size={22} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">No card settlements in this period</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="border-b border-border bg-muted px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                By settlement day — match these against your bank deposits
              </caption>
              <thead className="bg-card text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Receipts</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">Fees</th>
                  <th className="px-3 py-2 text-right">Expected Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {days.map((d) => (
                  <tr key={d.date}>
                    <td className="px-3 py-2 font-bold text-foreground">{d.date}</td>
                    <td className="px-3 py-2 text-right">{d.count}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(d.gross)}</td>
                    <td className="px-3 py-2 text-right font-mono text-destructive">
                      −{fmt(d.commission)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black text-success">
                      {fmt(d.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Invoice</th>
                  <th className="px-3 py-2 text-left">Card</th>
                  <th className="px-3 py-2 text-left">Holder</th>
                  <th className="px-3 py-2 text-left">Approval Ref</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Fee</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-xs font-bold text-foreground">
                      {new Date(r.transactionDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-3 py-2 font-bold text-foreground">{r.invoiceNumber}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-bold text-foreground">{r.issuerBank ?? '—'}</span>
                      <span className="block text-muted-foreground">
                        {r.cardNetwork} {r.cardType === 'DEBIT' ? 'Debit' : 'Credit'}
                        {r.cardLast4 ? ` ••••${r.cardLast4}` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs uppercase text-foreground">
                      {r.cardHolderName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.transactionReference ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(r.gross)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {r.ratePercent != null ? `${Number(r.ratePercent)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-destructive">
                      −{fmt(r.commission)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black text-success">
                      {fmt(r.net ?? r.gross)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.isDirectSale && r.commission == null ? (
                        <button
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                          disabled={!settlementAccountId || processingId === r.id}
                          onClick={() => processSettlement(r.id)}
                        >
                          {processingId === r.id ? 'Processing…' : 'Process'}
                        </button>
                      ) : r.isDirectSale ? (
                        <span className="text-xs font-bold text-success">Processed</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog
        open={!!commissionPromptFor}
        onOpenChange={(open) => !open && !processingId && setCommissionPromptFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter commission</DialogTitle>
            <DialogDescription>
              No fee rule is configured for this card. Enter the agreed commission to process
              {commissionPromptFor ? ` ${commissionPromptFor.invoiceNumber}` : ' this settlement'}.
              This commission will apply to this receipt only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="settlement-commission-mode">Commission type</Label>
              <Select
                value={commissionPromptMode}
                onValueChange={(value) => {
                  setCommissionPromptMode(value as 'PERCENTAGE' | 'AMOUNT');
                  setCommissionPromptValue('');
                }}
              >
                <SelectTrigger id="settlement-commission-mode" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="AMOUNT">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="settlement-commission-value">
                {commissionPromptMode === 'PERCENTAGE'
                  ? 'Commission percentage (%)'
                  : `Commission amount (${promptCurrency})`}
              </Label>
              <Input
                id="settlement-commission-value"
                type="number"
                min="0"
                max={commissionPromptMode === 'PERCENTAGE' ? 100 : promptGross}
                step="0.0001"
                autoFocus
                value={commissionPromptValue}
                onChange={(event) => setCommissionPromptValue(event.target.value)}
                placeholder={commissionPromptMode === 'PERCENTAGE' ? 'e.g. 1.95' : 'e.g. 100.00'}
              />
            </div>
            {promptCommissionRounded !== null && (
              <div className="space-y-1 rounded-lg border border-border bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span>Gross payment</span>
                  <span>{promptMoney.format(promptGross)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Commission deducted</span>
                  <span>− {promptMoney.format(promptCommissionRounded)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Net settlement</span>
                  <span>
                    {promptMoney.format(Math.max(0, promptGross - promptCommissionRounded))}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={!!processingId}
              onClick={() => setCommissionPromptFor(null)}
            >
              Cancel
            </Button>
            <Button disabled={!!processingId} onClick={confirmCommissionRate}>
              {processingId ? 'Processing…' : 'Process settlement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
