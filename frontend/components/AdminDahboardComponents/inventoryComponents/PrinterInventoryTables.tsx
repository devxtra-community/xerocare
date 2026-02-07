'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PrinterAssetTable from './PrinterAssetTable';
import IdlePrintersTable from './IdlePrintersTable';
import ServiceImpactTable from './ServiceImpactTable';
import InventoryActionsTable from './InventoryActionsTable';

export default function PrinterInventoryTables() {
  return (
    <div className="w-full">
      <Tabs defaultValue="assetSummary" className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
          <h3 className="text-lg font-semibold text-foreground w-full sm:w-auto">
            Detailed Reports
          </h3>
          <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-gray-100/80 rounded-xl">
            <TabsTrigger
              value="assetSummary"
              className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg text-xs sm:text-sm py-2 sm:py-1.5"
            >
              Asset Summary
            </TabsTrigger>
            <TabsTrigger
              value="idlePrinters"
              className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg text-xs sm:text-sm py-2 sm:py-1.5"
            >
              Idle Printers
            </TabsTrigger>
            <TabsTrigger
              value="serviceImpact"
              className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg text-xs sm:text-sm py-2 sm:py-1.5"
            >
              Service Impact
            </TabsTrigger>
            <TabsTrigger
              value="auditView"
              className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg text-xs sm:text-sm py-2 sm:py-1.5"
            >
              Audit View
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="assetSummary" className="mt-0">
          <PrinterAssetTable />
        </TabsContent>
        <TabsContent value="idlePrinters" className="mt-0">
          <IdlePrintersTable />
        </TabsContent>
        <TabsContent value="serviceImpact" className="mt-0">
          <ServiceImpactTable />
        </TabsContent>
        <TabsContent value="auditView" className="mt-0">
          <InventoryActionsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
