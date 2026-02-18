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
    totalStock: 0,
    productModels: 0,
    totalValue: 0,
    damagedStock: 0,
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await inventoryService.getInventoryStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Stock"
        value={stats.totalStock.toLocaleString()}
        subtitle="Items in inventory"
      />
      <StatCard
        title="Product Models"
        value={stats.productModels.toLocaleString()}
        subtitle="Unique models"
      />
      <StatCard
        title="Total Value"
        value={formatCurrency(stats.totalValue)}
        subtitle="Inventory worth"
      />
      <StatCard
        title="Damaged Stock"
        value={stats.damagedStock.toLocaleString()}
        subtitle="Items damaged"
      />
    </div>
  );
}
