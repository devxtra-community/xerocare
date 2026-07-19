'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Plus, RefreshCw } from 'lucide-react';
import { fetchExchangeRates, setExchangeRate } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { currencyOptions } from '@/lib/currencyList';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportPdfButton } from '@/components/shared/ExportPdfButton';
import { toast } from 'sonner';

/**
 * Shared Exchange Rates management UI, mounted under both the Finance and Admin
 * Accounts sections (same underlying `/accounts/admin/exchange-rates` endpoint) —
 * the rates recorded here back every dual-currency conversion and cross-branch
 * consolidated report in the app (accountsShared.ts convertAmt / lib/dualCurrency.ts).
 */
export default function ExchangeRatesManager() {
  const branchCurrency = useBranchCurrency();
  const qc = useQueryClient();
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [rate, setRate] = useState('');

  const {
    data: rates = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: fetchExchangeRates,
    staleTime: 60_000,
  });

  const mut = useMutation({
    mutationFn: () => setExchangeRate({ fromCurrency, toCurrency, rate: parseFloat(rate) }),
    onSuccess: () => {
      toast.success('Exchange rate saved');
      qc.invalidateQueries({ queryKey: ['exchange-rates'] });
      setFromCurrency('');
      setToCurrency(branchCurrency);
      setRate('');
    },
    onError: () => toast.error('Failed to save exchange rate'),
  });

  const canSave = fromCurrency && toCurrency && fromCurrency !== toCurrency && parseFloat(rate) > 0;

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" /> Exchange Rates
          </h3>
          <p className="text-muted-foreground text-sm">
            Conversion rates used across dual-currency displays and consolidated reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <ExportPdfButton targetId="exchange-rates-pdf" reportTitle="Exchange Rates" />
        </div>
      </div>

      <div id="exchange-rates-pdf" className="space-y-6">
        <div className="rounded-2xl bg-card shadow-sm border border-slate-100 p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Set / Update Rate
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">From Currency</label>
              <SearchableSelect
                options={currencyOptions()}
                value={fromCurrency}
                onValueChange={setFromCurrency}
                placeholder="Foreign currency"
                emptyText="No currency found."
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">To Currency</label>
              <SearchableSelect
                options={currencyOptions()}
                value={toCurrency || branchCurrency}
                onValueChange={setToCurrency}
                placeholder="Base currency"
                emptyText="No currency found."
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">
                Rate (1 {fromCurrency || '—'} = ? {toCurrency || branchCurrency})
              </label>
              <Input
                type="number"
                step="0.000001"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 3.6725"
                className="h-9 text-sm"
              />
            </div>
            <Button
              onClick={() => mut.mutate()}
              disabled={!canSave || mut.isPending}
              className="h-9 gap-2"
            >
              <Plus className="h-4 w-4" /> {mut.isPending ? 'Saving…' : 'Save Rate'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-card shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-primary text-sm">Current Rates</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-red-600 text-sm">
              Failed to load exchange rates.
            </div>
          ) : rates.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No exchange rates set yet. Add one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    {['From', 'To', 'Rate', 'Set By', 'Last Updated'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rates.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/10">
                      <td className="px-5 py-3 font-semibold text-slate-800">{r.fromCurrency}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{r.toCurrency}</td>
                      <td className="px-5 py-3 tabular-nums">
                        1 {r.fromCurrency} = {formatCurrency(r.rate, r.toCurrency)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{r.setBy}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Rates convert a foreign amount into the &quot;To&quot; currency (e.g. 1 USD = 3.6725 AED).
          Used for consolidated multi-branch reports, dual-currency displays (e.g. purchases,
          guarantee cheques, cash/bank balances), and any amount recorded in a currency other than
          the branch&apos;s own.
        </p>
      </div>
    </div>
  );
}
