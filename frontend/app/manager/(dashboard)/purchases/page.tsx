'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseStatsCards } from '@/components/ManagerDashboardComponents/purchaseComponents/PurchaseStats';
import PurchaseTable from '@/components/ManagerDashboardComponents/purchaseComponents/PurchaseTable';
import { getPurchases, getPurchaseStats, Purchase, PurchaseStats } from '@/lib/purchase';
import { toast } from 'sonner';

export default function PurchasePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PurchaseStats>({
    totalCost: 0,
    totalOrders: 0,
    totalVendors: 0,
    totalProducts: 0,
  });
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, purchasesData] = await Promise.all([getPurchaseStats(), getPurchases()]);
      setStats(statsData);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
    } catch {
      toast.error('Failed to load purchase data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary tracking-tight">Purchase Management</h1>
        <p className="text-slate-500">
          Manage your purchase orders, vendors, and inventory procurement.
        </p>
      </div>

      <PurchaseStatsCards stats={stats} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-1">
        <PurchaseTable purchases={purchases} loading={loading} onRefresh={loadData} />
      </div>
    </div>
  );
}
