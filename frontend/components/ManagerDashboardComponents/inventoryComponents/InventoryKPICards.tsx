'use client';
import React from 'react';
import StatCard from '@/components/StatCard';
import { inventoryService, InventoryStats } from '@/services/inventoryService';

/**
 * KPI Cards for Manager Inventory Dashboard.
 * Displays key metrics: Product Models count, Total Stock, Total Inventory Value, and Damaged Stock.
 * Provides high-level inventory health indicators.
 */
export default function InventoryKPICards() {
  const [stats, setStats] = React.useState<InventoryStats>({
    productStock: 0,
    spareStock: 0,
    productValue: 0,
    spareValue: 0,
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await inventoryService.getInventoryStats();
        if (data) setStats(data);
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `AED ${(value / 1000).toFixed(1)}k`;
    }
    return `AED ${(value || 0).toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Product Stock"
        value={(stats?.productStock ?? 0).toLocaleString()}
        subtitle="Items in inventory"
      />
      <StatCard
        title="Spare Parts Stock"
        value={(stats?.spareStock ?? 0).toLocaleString()}
        subtitle="Parts in inventory"
      />
      <StatCard
        title="Product Inventory Value"
        value={formatCurrency(stats?.productValue ?? 0)}
        subtitle="Products worth"
      />
      <StatCard
        title="Spare Parts Value"
        value={formatCurrency(stats?.spareValue ?? 0)}
        subtitle="Spare parts worth"
      />
    </div>
  );
}
