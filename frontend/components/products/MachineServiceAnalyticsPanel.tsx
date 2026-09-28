'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { getMachineAnalytics, MachineAnalytics } from '@/lib/serviceTicket';

/**
 * Real internal spend + service history for one machine, keyed by
 * serialNumber alone — works for company-owned (RENT/LEASE/SALE) AND
 * external machines never purchased from us. Staff-only: internal cost is
 * never shown on any customer-facing page.
 */
export default function MachineServiceAnalyticsPanel({
  serialNumber,
  currency,
}: {
  serialNumber?: string | null;
  currency?: string;
}) {
  const [analytics, setAnalytics] = useState<MachineAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serialNumber) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getMachineAnalytics(serialNumber);
        if (!cancelled) setAnalytics(data);
      } catch (err) {
        console.error('Failed to load machine service analytics:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serialNumber]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading service history…
      </div>
    );
  }

  if (!analytics || analytics.serviceVisitCount === 0) {
    return <p className="text-sm text-slate-400 py-2">No completed service tickets yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Times Serviced
          </p>
          <p className="text-lg font-bold text-slate-700">{analytics.serviceVisitCount}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Parts Spend
          </p>
          <p className="text-lg font-bold text-slate-700">
            {formatCurrency(analytics.lifetimePartsCost, currency)}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Labour Spend
          </p>
          <p className="text-lg font-bold text-slate-700">
            {formatCurrency(analytics.lifetimeLabourCost, currency)}
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
            Lifetime Spend
          </p>
          <p className="text-lg font-bold text-amber-700">
            {formatCurrency(analytics.lifetimeSpend, currency)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
              <th className="py-2 pr-2">Ticket</th>
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Context</th>
              <th className="py-2 pr-2">Parts Used</th>
              <th className="py-2 pr-2 text-right">Parts Cost</th>
              <th className="py-2 pr-2 text-right">Labour</th>
              <th className="py-2 text-right">Total Spend</th>
            </tr>
          </thead>
          <tbody>
            {analytics.tickets.map((t) => (
              <tr key={t.ticketId} className="border-b border-slate-50">
                <td className="py-2 pr-2 font-semibold text-slate-700">{t.ticketNumber}</td>
                <td className="py-2 pr-2 text-slate-500">
                  {t.date ? new Date(t.date).toLocaleDateString() : '—'}
                </td>
                <td className="py-2 pr-2 text-slate-500">{t.serviceContext}</td>
                <td className="py-2 pr-2 text-slate-500">
                  {t.partsUsed.length === 0
                    ? '—'
                    : t.partsUsed.map((p) => `${p.partName} ×${p.quantity}`).join(', ')}
                </td>
                <td className="py-2 pr-2 text-right text-slate-700">
                  {formatCurrency(t.partsCostInternal, currency)}
                </td>
                <td className="py-2 pr-2 text-right text-slate-700">
                  {formatCurrency(t.labourCost, currency)}
                </td>
                <td className="py-2 text-right font-bold text-slate-800">
                  {formatCurrency(t.totalSpend, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {analytics.toner.yieldHistory.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
            Toner Replacements ({analytics.toner.totalTonerReplacements})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-2">Toner SKU</th>
                  <th className="py-2 pr-2">Installed</th>
                  <th className="py-2 pr-2">Replaced</th>
                  <th className="py-2 text-right">Yield (pages)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.toner.yieldHistory.map((y) => (
                  <tr key={y.id} className="border-b border-slate-50">
                    <td className="py-2 pr-2 font-semibold text-slate-700">{y.tonerSku}</td>
                    <td className="py-2 pr-2 text-slate-500">
                      {new Date(y.installedDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-2 text-slate-500">
                      {y.replacedDate ? new Date(y.replacedDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2 text-right text-slate-700">
                      {y.yieldPages != null ? y.yieldPages.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
