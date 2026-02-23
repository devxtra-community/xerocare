'use client';
import React, { useState } from 'react';
import InventoryKPICards from '@/components/ManagerDashboardComponents/inventoryComponents/InventoryKPICards';
import InventoryTable from '@/components/ManagerDashboardComponents/inventoryComponents/InventoryTable';
import SparePartTable from '@/components/ManagerDashboardComponents/inventoryComponents/SparePartTable';
import { YearSelector } from '@/components/ui/YearSelector';

export default function ManagerInventoryPage() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* INVENTORY */}
      <div className="space-y-3 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Inventory Management</h3>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>

        {/* SUMMARY CARDS */}
        <InventoryKPICards selectedYear={selectedYear} />

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
