'use client';
import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { inventoryService, InventoryStats } from '@/services/inventoryService';
import { formatCurrency } from '@/lib/format';

/**
 * Component displaying key inventory performance indicators (KPIs).
 * Shows total stock count, damaged items, unique model count, and total inventory valuation.
 * Provides a high-level financial and operational summary of inventory.
 */
export default function InventoryKPICards({ selectedYear }: { selectedYear: number | 'all' }) {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await inventoryService.getInventoryStats(selectedYear);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-card/50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Product Stock"
        value={stats?.productStock.toLocaleString() || '0'}
        subtitle={`${selectedYear === 'all' ? 'Total' : selectedYear} printers in inventory`}
      />
      <StatCard
        title="Spare Parts Stock"
        value={stats?.spareStock.toLocaleString() || '0'}
        subtitle={`${selectedYear === 'all' ? 'Total' : selectedYear} spare parts items`}
      />
      <StatCard
        title="Product Inventory Value"
        value={formatCurrency(stats?.productValue || 0)}
        subtitle={`${selectedYear === 'all' ? 'Total' : selectedYear} printer valuation`}
      />
      <StatCard
        title="Spare Parts Value"
        value={formatCurrency(stats?.spareValue || 0)}
        subtitle={`${selectedYear === 'all' ? 'Total' : selectedYear} spare parts valuation`}
      />
    </div>
  );
}
