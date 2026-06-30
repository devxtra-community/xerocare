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
import { Plus, ArrowRightLeft, RefreshCw } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  INTRA_BRANCH: 'Intra-Branch',
  INTER_BRANCH: 'Inter-Branch',
};

export default function StockTransfersPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listStockTransfers({
        status: statusFilter || undefined,
        transfer_type: typeFilter || undefined,
        search: search || undefined,
      });
      setTransfers(data);
    } catch {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-blue-600" />
            Stock Transfers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage inter-branch requests and intra-branch warehouse moves
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/stock-transfers/new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
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
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="INTER_BRANCH">Inter-Branch</option>
              <option value="INTRA_BRANCH">Intra-Branch</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Transfer number..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ArrowRightLeft className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No transfers found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Transfer #</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3 font-semibold text-gray-600">From Branch</th>
                <th className="px-4 py-3 font-semibold text-gray-600">To Branch</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Items</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transfers.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/admin/stock-transfers/${t.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                    {t.transfer_number}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABELS[t.transfer_type] ?? t.transfer_type}
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
