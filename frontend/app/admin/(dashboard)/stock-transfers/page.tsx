'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, ArrowRightLeft, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listStockTransfers,
  StockTransfer,
  TransferStatus,
  TransferType,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/stockTransfer';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StockTransfersPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TransferType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listStockTransfers({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        transfer_type: typeFilter === 'ALL' ? undefined : typeFilter,
      });
      setTransfers(data);
    } catch {
      toast.error('Failed to load stock transfers');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = transfers.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.transfer_number.toLowerCase().includes(s) ||
      t.source_branch?.name?.toLowerCase().includes(s) ||
      t.destination_branch?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Stock Transfers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Move stock between warehouses and branches
          </p>
        </div>
        <Button
          onClick={() => router.push('/admin/stock-transfers/new')}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Transfer
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by transfer no. or branch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 text-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TransferStatus | 'ALL')}
        >
          <SelectTrigger className="w-48 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as TransferStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransferType | 'ALL')}>
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INTRA_BRANCH">Intra-Branch</SelectItem>
            <SelectItem value="INTER_BRANCH">Inter-Branch</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading transfers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <ArrowRightLeft className="h-8 w-8" />
            <p className="text-sm">No transfers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-50 bg-blue-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Transfer No.</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Route</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Items</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/stock-transfers/${t.id}`)}
                    className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-primary">
                      {t.transfer_number}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          t.transfer_type === 'INTER_BRANCH'
                            ? 'bg-violet-100 text-violet-700 border-0'
                            : 'bg-blue-100 text-blue-700 border-0'
                        }
                      >
                        {t.transfer_type === 'INTER_BRANCH' ? (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Inter-Branch
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <ArrowRightLeft className="h-3 w-3" /> Intra-Branch
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-medium">{t.source_branch?.name ?? '—'}</span>
                      {' → '}
                      <span className="font-medium">{t.destination_branch?.name ?? '—'}</span>
                      <div className="text-xs text-slate-400">
                        {t.source_warehouse?.warehouseName} →{' '}
                        {t.destination_warehouse?.warehouseName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${STATUS_COLORS[t.status]} border-0 text-xs`}>
                        {STATUS_LABELS[t.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t.items?.length ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(t.created_at), 'dd MMM yyyy')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
