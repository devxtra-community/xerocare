'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listStockTransfers,
  StockTransfer,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/stockTransfer';
import { toast } from 'sonner';
import { Plus, ArrowRightLeft, RefreshCw, Inbox, Send } from 'lucide-react';

export default function ManagerStockTransfersPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'incoming'>('all');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listStockTransfers({ status: statusFilter || undefined });
      setTransfers(data);
    } catch {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  // Managers see transfers where they are either the requester OR the source
  // Backend already returns both — we filter on frontend for tabs
  const incoming = transfers.filter((t) => t.status === 'PENDING');

  const displayed = tab === 'incoming' ? incoming : transfers;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-blue-600" />
            Stock Transfers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Request stock from other branches or move stock within your branch
          </p>
        </div>
        <button
          onClick={() => router.push('/manager/stock-transfers/new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('all')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          All Transfers
          <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full ml-1">
            {transfers.length}
          </span>
        </button>
        <button
          onClick={() => setTab('incoming')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'incoming'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          Incoming Requests
          {incoming.length > 0 && (
            <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
              {incoming.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'incoming' && incoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>{incoming.length}</strong> transfer request(s) from other branches need your
          response. Review each request, check your inventory, and decide what you can provide.
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ArrowRightLeft className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">
              {tab === 'incoming' ? 'No incoming requests' : 'No transfers found'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Transfer #</th>
                <th className="px-4 py-3 font-semibold text-gray-600">From</th>
                <th className="px-4 py-3 font-semibold text-gray-600">To</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Items</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/manager/stock-transfers/${t.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                    {t.transfer_number}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{t.source_branch?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-800">{t.requesting_branch?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.items?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[t.status]}`}
                    >
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
