'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InventoryKPICards from '@/components/ManagerDashboardComponents/inventoryComponents/InventoryKPICards';
import InventoryTable from '@/components/ManagerDashboardComponents/inventoryComponents/InventoryTable';
import SparePartTable from '@/components/ManagerDashboardComponents/inventoryComponents/SparePartTable';
import { YearSelector } from '@/components/ui/YearSelector';
import { ArrowRightLeft } from 'lucide-react';
import { getPendingTransferCount } from '@/lib/stockTransfer';

export default function ManagerInventoryPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(2026);
  const [pendingTransfers, setPendingTransfers] = useState<number | null>(null);

  useEffect(() => {
    setSelectedYear(new Date().getFullYear());
    getPendingTransferCount()
      .then(setPendingTransfers)
      .catch(() => {});
  }, []);

  return (
    <div
      className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6"
      suppressHydrationWarning
    >
      {/* INVENTORY */}
      <div className="space-y-3 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Inventory Management</h3>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>

        {/* SUMMARY CARDS */}
        <InventoryKPICards selectedYear={selectedYear} />

        {/* Pending Transfers Widget */}
        {pendingTransfers !== null && pendingTransfers > 0 && (
          <button
            onClick={() => router.push('/manager/stock-transfers')}
            className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors text-left w-full sm:w-auto"
          >
            <div className="bg-amber-100 rounded-lg p-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <div className="font-semibold text-sm text-amber-800">
                {pendingTransfers} Pending Transfer{pendingTransfers !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-amber-600">Awaiting your action — click to view</div>
            </div>
          </button>
        )}

        {/* MAIN TABLES */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-primary">Product Inventory</h3>
            <div className="bg-card rounded-xl shadow-sm border border-gray-100">
              <InventoryTable mode="branch" selectedYear={selectedYear} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-primary">Spare Part Inventory</h3>
            <div className="bg-card rounded-xl shadow-sm border border-gray-100 p-4">
              <SparePartTable selectedYear={selectedYear} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
