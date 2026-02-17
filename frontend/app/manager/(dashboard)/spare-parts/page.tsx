'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import AddSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/AddSparePartDialog';
import BulkSparePartDialog from '@/components/ManagerDashboardComponents/spareParts/BulkSparePartDialog';
import SparePartTable from '@/components/ManagerDashboardComponents/inventoryComponents/SparePartTable';

export default function SparePartsPage() {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Spare Parts Inventory</h3>
        <div className="flex gap-2">
          <Button className="bg-primary text-white gap-2" onClick={() => setAddOpen(true)}>
            + Add Item
          </Button>
          <Button
            className="bg-card text-primary border border-primary gap-2 hover:bg-muted/50"
            onClick={() => setBulkOpen(true)}
          >
            <Upload size={16} /> Bulk Upload
          </Button>
        </div>
      </div>

      <SparePartTable key={refreshKey} />

      {bulkOpen && (
        <BulkSparePartDialog open={bulkOpen} onOpenChange={setBulkOpen} onSuccess={handleRefresh} />
      )}

      {addOpen && (
        <AddSparePartDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={handleRefresh} />
      )}
    </div>
  );
}
