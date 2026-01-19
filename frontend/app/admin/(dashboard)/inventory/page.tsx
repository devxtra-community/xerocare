'use client';
import React from 'react';
import InventoryKPICards from '@/components/AdminDashboardComponents/inventoryComponents/InventoryKPICards';
import InventoryProductsTable from '@/components/AdminDashboardComponents/inventoryComponents/InventoryProductsTable';
import InventoryChart from '@/components/AdminDashboardComponents/inventoryComponents/InventoryChart';
import StockStatusDonut from '@/components/AdminDashboardComponents/inventoryComponents/StockStatusDonut';
import StockMovementTrend from '@/components/AdminDashboardComponents/inventoryComponents/StockMovementTrend';

export default function InventoryPage() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* INVENTORY */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Inventory Management</h3>

        {/* SUMMARY CARDS */}
        <InventoryKPICards />

        {/* TABLE + TREND */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          <div className="xl:col-span-2 flex flex-col space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Product Inventory</h3>
            <div className="flex-1">
              <InventoryProductsTable />
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Stock Activity</h3>
            <div className="bg-white rounded-xl p-3 flex-1">
              <InventoryChart />
            </div>
          </div>
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-primary">Stock Status Overview</h4>
            <div className="bg-white rounded-xl p-3 h-[280px]">
              <StockStatusDonut />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-primary">Movement Trend</h4>
            <div className="bg-white rounded-xl p-3 h-[280px]">
              <StockMovementTrend />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
