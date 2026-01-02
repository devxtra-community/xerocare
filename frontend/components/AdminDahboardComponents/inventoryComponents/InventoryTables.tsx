'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryMasterTable from './InventoryMasterTable';
import AuditLogTable from './AuditLogTable';
import WarehouseInventoryTable from './WarehouseInventoryTable';
import LowStockTable from './LowStockTable';

export default function InventoryTables() {
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory Details</h2>
          <p className="text-sm text-muted-foreground">
            Manage and track your entire inventory system
          </p>
        </div>
      </div>

      <Tabs defaultValue="master" className="w-full">
        <TabsList className="mb-4 w-full h-auto flex flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger
            value="master"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white"
          >
            Inventory Master
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white"
          >
            Stock Movement Log
          </TabsTrigger>
          <TabsTrigger
            value="warehouse"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white"
          >
            Warehouse Summary
          </TabsTrigger>
          <TabsTrigger
            value="lowstock"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white"
          >
            Critical Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="mt-0">
          <InventoryMasterTable />
        </TabsContent>
        <TabsContent value="audit" className="mt-0">
          <AuditLogTable />
        </TabsContent>
        <TabsContent value="warehouse" className="mt-0">
          <WarehouseInventoryTable />
        </TabsContent>
        <TabsContent value="lowstock" className="mt-0">
          <LowStockTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
