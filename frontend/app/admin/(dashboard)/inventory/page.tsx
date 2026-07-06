'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InventoryKPICards from '@/components/AdminDahboardComponents/inventoryComponents/InventoryKPICards';
import InventoryProductsTable from '@/components/AdminDahboardComponents/inventoryComponents/InventoryProductsTable';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventorySparePartsTable from '@/components/AdminDahboardComponents/inventoryComponents/InventorySparePartsTable';
import { YearSelector } from '@/components/ui/YearSelector';
import { Input } from '@/components/ui/input';
import { ScanLine, Loader2, ArrowRightLeft } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { getPendingTransferCount } from '@/lib/stockTransfer';

export default function InventoryPage() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [scanCode, setScanCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [pendingTransfers, setPendingTransfers] = useState<number | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    getPendingTransferCount()
      .then(setPendingTransfers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  const handleScan = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setScanning(true);
    try {
      const res = await api.get<{
        success: boolean;
        type: 'PRODUCT' | 'SPARE_PART';
        item: { id: string };
        warning?: string;
      }>(`/i/inventory/scan?code=${encodeURIComponent(trimmed)}`);
      if (res.data.warning) toast.warning(res.data.warning);
      if (res.data.type === 'PRODUCT') {
        router.push(`/admin/products/${res.data.item.id}`);
      } else {
        toast.info(`Spare part found: ${trimmed}`);
      }
    } catch {
      toast.error(`No item found for: ${trimmed}`);
    } finally {
      setScanning(false);
      setScanCode('');
    }
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* INVENTORY */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl sm:text-2xl font-bold text-primary">Inventory Management</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {scanning && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
              )}
              <Input
                ref={scanInputRef}
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScan(scanCode);
                }}
                placeholder="Scan or type barcode / serial..."
                className="pl-9 pr-9 w-72 bg-white border-slate-200 text-sm"
              />
            </div>
            <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <InventoryKPICards selectedYear={selectedYear} />

        {/* Pending Transfers Widget */}
        {pendingTransfers !== null && pendingTransfers > 0 && (
          <button
            onClick={() => router.push('/admin/stock-transfers')}
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
