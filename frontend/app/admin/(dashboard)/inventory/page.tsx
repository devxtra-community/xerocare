'use client';
import React, { useState } from 'react';
import InventoryKPICards from '@/components/AdminDahboardComponents/inventoryComponents/InventoryKPICards';
import InventoryProductsTable from '@/components/AdminDahboardComponents/inventoryComponents/InventoryProductsTable';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventorySparePartsTable from '@/components/AdminDahboardComponents/inventoryComponents/InventorySparePartsTable';
import { YearSelector } from '@/components/ui/YearSelector';

export default function InventoryPage() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* INVENTORY */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl sm:text-2xl font-bold text-primary">Inventory Management</h3>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>

        {/* SUMMARY CARDS */}
        <InventoryKPICards selectedYear={selectedYear} />

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="bg-white/50 border border-blue-100/50 p-1 h-11 w-max mb-6">
            <TabsTrigger
              value="products"
              className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-bold uppercase transition-all"
            >
              Product Inventory
            </TabsTrigger>
            <TabsTrigger
              value="spareparts"
              className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-bold uppercase transition-all"
            >
              Spare Parts Inventory
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="products"
            className="space-y-6 focus-visible:outline-none focus-visible:ring-0"
          >
            <div className="flex flex-col space-y-4">
              <h3 className="text-lg sm:text-xl font-bold text-primary">Product Inventory</h3>
              <div className="flex-1">
                <InventoryProductsTable selectedYear={selectedYear} />
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="spareparts"
            className="space-y-6 focus-visible:outline-none focus-visible:ring-0"
          >
            <div className="flex flex-col space-y-4">
              <h3 className="text-lg sm:text-xl font-bold text-primary">Spare Parts Inventory</h3>
              <div className="flex-1">
                <InventorySparePartsTable selectedYear={selectedYear} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
