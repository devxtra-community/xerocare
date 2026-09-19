'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { getCustomerServiceHistory, CustomerServiceHistory } from '@/lib/serviceTicket';
import { getServiceContracts, ServiceContract } from '@/lib/serviceContract';
import { getAllModels, Model } from '@/lib/model';
import {
  getRentedMachines,
  getLeasedMachines,
  getPurchasedMachines,
  getContractMachines,
  getExternalMachines,
  MachineAllocation,
} from '@/lib/machineAllocations';
import MachineServiceAnalyticsPanel from '@/components/products/MachineServiceAnalyticsPanel';

interface AdHocMachine {
  serialNumber: string;
  label: string;
  ticketCount: number;
  lastTicketDate?: string;
}

const GROUP_META: Record<string, { label: string; badgeClass: string }> = {
  SALE: { label: 'Purchased', badgeClass: 'bg-blue-50 text-blue-700 border-blue-100' },
  RENT: {
    label: 'Rented from us',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  LEASE: { label: 'Leased from us', badgeClass: 'bg-purple-50 text-purple-700 border-purple-100' },
  AMC: { label: 'AMC Contract', badgeClass: 'bg-amber-50 text-amber-700 border-amber-100' },
  SMA: { label: 'SMA Contract', badgeClass: 'bg-amber-50 text-amber-700 border-amber-100' },
  FSMA: { label: 'FSMA Contract', badgeClass: 'bg-amber-50 text-amber-700 border-amber-100' },
  EXTERNAL: {
    label: 'Under our service (external machine)',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

/**
 * Every machine relationship a customer has with us: bought, rented, leased,
 * under an AMC/SMA/FSMA contract (even on a third-party machine we never
 * sold them), or serviced ad-hoc with no contract at all. Reuses the same
 * customer→machine derivation (`machineAllocations.ts`) already built for
 * the service-ticket creation machine picker — this just renders it here too.
 */
export default function CustomerProductsPanel({
  customerId,
  productBasePath,
}: {
  customerId: string;
  /** e.g. "/manager" or "/admin" — only passed by roles that have a product
   *  detail page, so a machine name links through to it. Omit to render
   *  plain, non-clickable cards (e.g. employee/finance/hr views). */
  productBasePath?: string;
}) {
  const router = useRouter();
  const [history, setHistory] = useState<CustomerServiceHistory | null>(null);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSerial, setExpandedSerial] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [h, c, m] = await Promise.all([
          getCustomerServiceHistory(customerId),
          getServiceContracts({ customerId }).catch(() => []),
          getAllModels({ limit: 1000 }).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setHistory(h);
        setContracts(c);
        setModels(m.data || []);
      } catch (err) {
        console.error('Failed to load customer products:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const groups = useMemo(() => {
    if (!history) return [] as { key: string; machines: MachineAllocation[] }[];
    const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
    const purchased = getPurchasedMachines(history, models);
    const rented = getRentedMachines(history, models);
    const leased = getLeasedMachines(history, models);
    const contractMachines = getContractMachines(history, models);
    const external = getExternalMachines(history, activeContracts);

    const byType: Record<string, MachineAllocation[]> = {
      SALE: purchased,
      RENT: rented,
      LEASE: leased,
      EXTERNAL: external,
    };
    // getContractMachines returns AMC/FSMA/SMA mixed together, each item
    // already carrying its own `type` — split back out per-type for display.
    for (const m of contractMachines) {
      (byType[m.type] ||= []).push(m);
    }

    return Object.entries(byType)
      .filter(([, list]) => list.length > 0)
      .map(([key, machines]) => ({ key, machines }));
  }, [history, contracts, models]);

  // Ad-hoc: chargeable tickets on a machine that's neither a billing
  // allocation nor a registered (even external) Product — a pure walk-in
  // repair with only free-text machine info on the ticket itself.
  const adHocMachines = useMemo<AdHocMachine[]>(() => {
    if (!history?.tickets) return [];
    const knownSerials = new Set(
      groups.flatMap((g) => g.machines.map((m) => m.serialNumber).filter(Boolean)),
    );
    const bySerial = new Map<string, AdHocMachine>();
    for (const t of history.tickets) {
      if (t.productId) continue;
      const serial = t.serialNumber;
      if (!serial || knownSerials.has(serial)) continue;
      const label =
        [t.productBrand, t.productModel || t.productName].filter(Boolean).join(' — ') ||
        'Unregistered machine';
      const existing = bySerial.get(serial);
      const ticketDate = t.completedAt || t.created_at;
      if (existing) {
        existing.ticketCount += 1;
        if (ticketDate && (!existing.lastTicketDate || ticketDate > existing.lastTicketDate)) {
          existing.lastTicketDate = ticketDate;
        }
      } else {
        bySerial.set(serial, {
          serialNumber: serial,
          label,
          ticketCount: 1,
          lastTicketDate: ticketDate,
        });
      }
    }
    return Array.from(bySerial.values());
  }, [history, groups]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading products & services…
      </div>
    );
  }

  if (groups.length === 0 && adHocMachines.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-6">
        No products, rentals, leases, contracts, or service history for this customer yet.
      </p>
    );
  }

  const goToProduct = (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!productBasePath || !id) return;
    router.push(`${productBasePath}/products/${id}`);
  };

  return (
    <div className="space-y-6">
      {groups.map(({ key, machines }) => {
        const meta = GROUP_META[key] || {
          label: key,
          badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        };
        return (
          <div key={key}>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              {meta.label}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {machines.length}
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {machines.map((m) => {
                const isExpanded = expandedSerial === m.serialNumber;
                const canOpenProductPage = !!productBasePath && !!m.id;
                return (
                  <div
                    key={`${key}-${m.id}-${m.serialNumber}`}
                    onClick={() => setExpandedSerial(isExpanded ? null : m.serialNumber || null)}
                    className={`rounded-xl border p-3 space-y-1 cursor-pointer transition-colors ${
                      isExpanded
                        ? 'border-indigo-300 bg-indigo-50/30'
                        : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {m.modelName}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {canOpenProductPage && (
                          <button
                            onClick={(e) => goToProduct(e, m.id)}
                            title="Open product page"
                            className="text-slate-300 hover:text-indigo-500"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {m.brandName ? `${m.brandName} • ` : ''}SN: {m.serialNumber}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}
                    >
                      {m.contractType || key}
                    </span>
                    {m.effectiveTo && (
                      <p className="text-[10px] text-slate-400">
                        {key === 'SALE' ? 'Warranty until' : 'Ends'}{' '}
                        {new Date(m.effectiveTo).toLocaleDateString()}
                      </p>
                    )}
                    {m.remainingTime && (
                      <p className="text-[10px] text-slate-400">{m.remainingTime}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {machines.some((m) => m.serialNumber && m.serialNumber === expandedSerial) && (
              <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-4">
                <h5 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2">
                  Service & Spend — {expandedSerial}
                </h5>
                <MachineServiceAnalyticsPanel serialNumber={expandedSerial} />
              </div>
            )}
          </div>
        );
      })}

      {adHocMachines.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            One-off service (unregistered / external machine)
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {adHocMachines.length}
            </span>
          </h4>
          <div className="space-y-2">
            {adHocMachines.map((m) => {
              const isExpanded = expandedSerial === m.serialNumber;
              return (
                <div
                  key={m.serialNumber}
                  className="rounded-xl border border-slate-100 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSerial(isExpanded ? null : m.serialNumber)}
                    className="w-full flex items-center justify-between gap-2 p-3 bg-slate-50/30 hover:bg-slate-50 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{m.label}</p>
                      <p className="text-[11px] text-slate-500">
                        SN: {m.serialNumber} • {m.ticketCount} ticket{m.ticketCount > 1 ? 's' : ''}
                        {m.lastTicketDate &&
                          ` • last ${new Date(m.lastTicketDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="p-3 border-t border-slate-100">
                      <MachineServiceAnalyticsPanel serialNumber={m.serialNumber} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
