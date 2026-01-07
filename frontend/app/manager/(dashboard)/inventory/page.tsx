'use client';
import React from 'react';
import InventoryKPICards from '@/components/ManagerDashboardComponents/inventoryComponents/InventoryKPICards';
import InventoryTable from '@/components/ManagerDashboardComponents/inventoryComponents/InventoryTable';
import StockByCategoryChart from '@/components/ManagerDashboardComponents/inventoryComponents/StockByCategoryChart';
import MostMovedProductsChart from '@/components/ManagerDashboardComponents/inventoryComponents/MostMovedProductsChart';

export default function ManagerInventoryPage() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* INVENTORY */}
      <div className="space-y-3 sm:space-y-5">
        <h3 className="text-lg sm:text-xl font-bold text-primary">Inventory Management</h3>

        {/* SUMMARY CARDS */}
        <InventoryKPICards />

        {/* MAIN TABLE */}
        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-primary">Product Inventory</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <InventoryTable />
          </div>
        </div>

        {/* ANALYTICS CHARTS - Same Height Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          <div className="flex flex-col space-y-3">
            <h4 className="text-base sm:text-lg font-bold text-primary">Most Moved Products</h4>
            <div className="bg-white rounded-xl p-3 flex-1 flex flex-col min-h-[280px]">
              <MostMovedProductsChart />
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <h4 className="text-base sm:text-lg font-bold text-primary">Stock by Category</h4>
            <div className="bg-white rounded-xl p-3 flex-1 flex flex-col min-h-[280px]">
              <StockByCategoryChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
