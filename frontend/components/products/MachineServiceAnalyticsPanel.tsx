'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { getMachineAnalytics, MachineAnalytics } from '@/lib/serviceTicket';

/**
 * Machine service cost + service history for one machine, keyed by
 * serialNumber alone — works for company-owned (RENT/LEASE/SALE) AND
 * external machines never purchased from us. Staff-only: service cost is
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
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading service history…
      </div>
    );
  }

  if (!analytics || analytics.serviceVisitCount === 0) {
    return <p className="text-sm text-muted-foreground py-2">No completed service tickets yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-muted rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Times Serviced
          </p>
          <p className="text-lg font-bold text-foreground">{analytics.serviceVisitCount}</p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Parts Service Cost
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(analytics.lifetimePartsCost, currency)}
          </p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Labour Cost
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(analytics.lifetimeLabourCost, currency)}
          </p>
        </div>
        <div className="bg-warning/10 rounded-xl p-3">
          <p className="text-[10px] font-bold text-warning uppercase tracking-wide">
            Lifetime Service Cost
          </p>
          <p className="text-lg font-bold text-warning">
            {formatCurrency(analytics.lifetimeSpend, currency)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] font-bold text-muted-foreground uppercase border-b border-border">
              <th className="py-2 pr-2">Ticket</th>
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Context</th>
              <th className="py-2 pr-2">Parts Used</th>
              <th className="py-2 pr-2 text-right">Parts Service Cost</th>
              <th className="py-2 pr-2 text-right">Labour Cost</th>
              <th className="py-2 text-right">Total Service Cost</th>
            </tr>
          </thead>
          <tbody>
            {analytics.tickets.map((t) => (
              <tr key={t.ticketId} className="border-b border-border">
                <td className="py-2 pr-2 font-semibold text-foreground">{t.ticketNumber}</td>
                <td className="py-2 pr-2 text-muted-foreground">
                  {t.date ? new Date(t.date).toLocaleDateString() : '—'}
                </td>
                <td className="py-2 pr-2 text-muted-foreground">{t.serviceContext}</td>
                <td className="py-2 pr-2 text-muted-foreground">
                  {t.partsUsed.length === 0
                    ? '—'
                    : t.partsUsed.map((p) => `${p.partName} ×${p.quantity}`).join(', ')}
                </td>
                <td className="py-2 pr-2 text-right text-foreground">
                  {formatCurrency(t.partsCostInternal, currency)}
                </td>
                <td className="py-2 pr-2 text-right text-foreground">
                  {formatCurrency(t.labourCost, currency)}
                </td>
                <td className="py-2 text-right font-bold text-foreground">
                  {formatCurrency(t.totalSpend, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {analytics.toner.yieldHistory.length > 0 && (
        <div className="pt-2 border-t border-border">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
            Toner Replacements ({analytics.toner.totalTonerReplacements})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-muted-foreground uppercase border-b border-border">
                  <th className="py-2 pr-2">Toner SKU</th>
                  <th className="py-2 pr-2">Installed</th>
                  <th className="py-2 pr-2">Replaced</th>
                  <th className="py-2 text-right">Yield (pages)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.toner.yieldHistory.map((y) => (
                  <tr key={y.id} className="border-b border-border">
                    <td className="py-2 pr-2 font-semibold text-foreground">{y.tonerSku}</td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {new Date(y.installedDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {y.replacedDate ? new Date(y.replacedDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2 text-right text-foreground">
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
