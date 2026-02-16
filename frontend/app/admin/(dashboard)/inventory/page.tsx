'use client';
import React from 'react';
import InventoryKPICards from '@/components/AdminDahboardComponents/inventoryComponents/InventoryKPICards';
import InventoryProductsTable from '@/components/AdminDahboardComponents/inventoryComponents/InventoryProductsTable';
import InventoryChart from '@/components/AdminDahboardComponents/inventoryComponents/InventoryChart';
import StockStatusDonut from '@/components/AdminDahboardComponents/inventoryComponents/StockStatusDonut';

export default function InventoryPage() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* INVENTORY */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Inventory Management</h3>

        {/* SUMMARY CARDS */}
        <InventoryKPICards />

        {/* TABLE */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Product Inventory</h3>
          <div className="flex-1">
            <InventoryProductsTable />
          </div>
        </div>

        {/* ANALYTICS & STOCK ACTIVITY */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {/* Stock Overview (1/3 width) */}
          <div className="space-y-4 xl:col-span-1">
            <h4 className="text-lg sm:text-xl font-bold text-primary">Stock Status Overview</h4>
            <div className="bg-card rounded-xl p-3 h-[280px]">
              <StockStatusDonut />
            </div>
          </div>

          {/* Stock Activity (2/3 width) - Replaces Movement Trend */}
          <div className="space-y-4 xl:col-span-2">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Stock Activity</h3>
            <div className="bg-card rounded-xl p-3 h-[280px]">
              <InventoryChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
