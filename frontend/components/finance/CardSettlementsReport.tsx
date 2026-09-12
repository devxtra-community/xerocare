'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, Search, Landmark } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { GCC_COUNTRIES, CARD_NETWORK_LABEL, CardNetwork } from '@/lib/payments/gccCards';
import StatCard from '@/components/StatCard';

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

  const currency = useMemo(() => rows[0]?.currency ?? 'AED', [rows]);
  const fmt = (n: number | string | null | undefined) =>
    Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-800">
          <Landmark size={20} className="text-indigo-600" />
          Card Settlements
        </h1>
        <p className="mt-1 max-w-3xl text-xs font-medium text-slate-500">
          What customers paid by card, what the acquirer&apos;s commission took, and what should
          therefore have reached the bank. Group totals are per settlement day, so a single deposit
          on the bank statement can be matched to the receipts behind it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-6">
        <div>
          <Label className="text-[10px] font-black uppercase text-slate-400">From</Label>
          <Input
            type="date"
            className="mt-1 h-9"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-slate-400">To</Label>
          <Input
            type="date"
            className="mt-1 h-9"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-slate-400">Card Type</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            value={cardType}
            onChange={(e) => setCardType(e.target.value)}
          >
            <option value="">All</option>
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-slate-400">Network</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            value={cardNetwork}
            onChange={(e) => setCardNetwork(e.target.value)}
          >
            <option value="">All</option>
            {(Object.keys(CARD_NETWORK_LABEL) as CardNetwork[]).map((n) => (
              <option key={n} value={n}>
                {CARD_NETWORK_LABEL[n]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-slate-400">Country</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            value={issuerCountry}
            onChange={(e) => setIssuerCountry(e.target.value)}
          >
            <option value="">All</option>
            {GCC_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase text-slate-400">Search</Label>
          <div className="relative mt-1">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
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
        <div className="flex items-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading settlements…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <CreditCard size={22} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-bold text-slate-600">No card settlements in this period</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                By settlement day — match these against your bank deposits
              </caption>
              <thead className="bg-white text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Receipts</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">Fees</th>
                  <th className="px-3 py-2 text-right">Expected Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.map((d) => (
                  <tr key={d.date}>
                    <td className="px-3 py-2 font-bold text-slate-700">{d.date}</td>
                    <td className="px-3 py-2 text-right">{d.count}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(d.gross)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">
                      −{fmt(d.commission)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black text-emerald-700">
                      {fmt(d.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-xs font-bold text-slate-600">
                      {new Date(r.transactionDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-700">{r.invoiceNumber}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-bold text-slate-700">{r.issuerBank ?? '—'}</span>
                      <span className="block text-slate-400">
                        {r.cardNetwork} {r.cardType === 'DEBIT' ? 'Debit' : 'Credit'}
                        {r.cardLast4 ? ` ••••${r.cardLast4}` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs uppercase text-slate-600">
                      {r.cardHolderName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {r.transactionReference ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(r.gross)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">
                      {r.ratePercent != null ? `${Number(r.ratePercent)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">
                      −{fmt(r.commission)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black text-emerald-700">
                      {fmt(r.net ?? r.gross)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
