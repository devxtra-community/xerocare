'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getOngoingContracts,
  setContractRenewalDecision,
  OngoingContractSummary,
} from '@/lib/invoice';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertTriangle, CalendarClock, Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { ExtendContractModal } from '@/components/Finance/ExtendContractModal';

const safeFormatDate = (val?: string) => {
  if (!val) return '—';
  try {
    return format(new Date(val), 'dd MMM yyyy');
  } catch {
    return '—';
  }
};

function StatusPill({ contract }: { contract: OngoingContractSummary }) {
  if (contract.isPastEnd) {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
        Past End Date ({Math.abs(contract.daysRemaining)}d overdue)
      </Badge>
    );
  }
  if (contract.isFullyBilled) {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
        All {contract.periodsTotal} periods billed
      </Badge>
    );
  }
  if (contract.isLastPeriod) {
    // Say which clock actually put it here. A contract billed eleven periods ahead of
    // its calendar reads as "Final Period" while still showing a year of days left —
    // reporting the days would look like a mistake, so report the periods instead.
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">
        {contract.lastPeriodReason === 'BILLING'
          ? `Final Period — ${contract.periodsRemaining} period${
              contract.periodsRemaining === 1 ? '' : 's'
            } left to bill`
          : `Final Period — ${contract.daysRemaining}d left`}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-slate-500">
      {contract.daysRemaining}d remaining
    </Badge>
  );
}

export default function ContractRenewalsPage() {
  const currency = useBranchCurrency();
  const [contracts, setContracts] = useState<OngoingContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionSaving, setDecisionSaving] = useState<string | null>(null);
  const [extendTarget, setExtendTarget] = useState<OngoingContractSummary | null>(null);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOngoingContracts();
      setContracts(data);
    } catch (err) {
      console.error('Failed to load ongoing contracts:', err);
      toast.error('Failed to load ongoing contracts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleDecision = async (
    contract: OngoingContractSummary,
    decision: 'RENEWAL_APPROVED' | 'CONTRACT_ENDED',
  ) => {
    setDecisionSaving(contract.id);
    try {
      await setContractRenewalDecision(contract.id, decision);
      toast.success(
        decision === 'RENEWAL_APPROVED'
          ? `Renewal approved for ${contract.invoiceNumber} — you can now extend it.`
          : `Recorded: ${contract.invoiceNumber} will not be renewed.`,
      );
      await fetchContracts();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to record decision.';
      toast.error(message);
    } finally {
      setDecisionSaving(null);
    }
  };

  const lastPeriodContracts = contracts.filter((c) => c.isLastPeriod);
  const undecidedCount = lastPeriodContracts.filter((c) => !c.renewalDecision).length;

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Contract Renewals</h3>
          <p className="text-muted-foreground">
            Rent &amp; Lease contracts entering their final billing period — decide renewal and
            extend from here.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchContracts} disabled={loading}>
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {undecidedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {undecidedCount} contract{undecidedCount === 1 ? ' is' : 's are'} in{' '}
            {undecidedCount === 1 ? 'its' : 'their'} final billing period and still need
            {undecidedCount === 1 ? 's' : ''} a renewal decision.
          </p>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Machine(s)</TableHead>
                <TableHead className="text-right">Monthly Rent</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Renewal Decision</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="animate-spin inline-block mr-2" size={16} />
                    Loading ongoing contracts...
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No ongoing Rent or Lease contracts right now.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((c) => (
                  <TableRow
                    key={c.id}
                    className={
                      c.isLastPeriod && !c.renewalDecision ? 'bg-amber-50/60 hover:bg-amber-50' : ''
                    }
                  >
                    <TableCell className="font-bold text-slate-800">{c.invoiceNumber}</TableCell>
                    <TableCell>{c.customerName || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {c.saleType}
                        {c.saleType === 'LEASE' && c.leaseType ? ` (${c.leaseType})` : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {c.machineDescriptions.length > 0 ? c.machineDescriptions.join(', ') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(c.monthlyRent || 0, currency)}
                    </TableCell>
                    <TableCell>
                      <div>{safeFormatDate(c.effectiveTo)}</div>
                      <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        {c.periodsBilled} of {c.periodsTotal} periods billed
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill contract={c} />
                    </TableCell>
                    <TableCell>
                      {!c.isLastPeriod ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : c.renewalDecision === 'RENEWAL_APPROVED' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                          Customer Approved Renewal
                        </Badge>
                      ) : c.renewalDecision === 'CONTRACT_ENDED' ? (
                        <Badge className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100">
                          Contract Ended
                        </Badge>
                      ) : (
                        <Select
                          disabled={decisionSaving === c.id}
                          onValueChange={(val) =>
                            handleDecision(c, val as 'RENEWAL_APPROVED' | 'CONTRACT_ENDED')
                          }
                        >
                          <SelectTrigger className="h-8 text-xs w-52">
                            <SelectValue placeholder="Select outcome..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RENEWAL_APPROVED">
                              Customer Approved Renewal
                            </SelectItem>
                            <SelectItem value="CONTRACT_ENDED">Contract Ended</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.renewalDecision === 'RENEWAL_APPROVED' && (
                        <Button
                          size="sm"
                          onClick={() => setExtendTarget(c)}
                          className="h-8 text-xs"
                        >
                          <CalendarClock size={14} className="mr-1.5" />
                          Extend Contract
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {extendTarget && (
        <ExtendContractModal
          contract={extendTarget}
          onClose={() => setExtendTarget(null)}
          onExtended={() => {
            setExtendTarget(null);
            fetchContracts();
          }}
        />
      )}
    </div>
  );
}
