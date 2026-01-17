'use client';
import React from 'react';
import StatCard from '@/components/StatCard';
import { inventoryService } from '@/services/inventoryService';

export default function InventoryKPICards() {
  const [stats, setStats] = React.useState({
    totalProducts: 0,
    totalStockUnits: 0,
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
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Products"
        value={stats.totalProducts.toLocaleString()}
        subtitle="Across all categories"
      />
      <StatCard
        title="Total Stock Units"
        value={stats.totalStockUnits.toLocaleString()}
        subtitle="Items available in stock"
      />
      <StatCard
        title="Total Inventory Value"
        value={formatCurrency(stats.totalValue)}
        subtitle="Total valuation"
      />
      <StatCard
        title="Damaged / Returned Stock"
        value={stats.damagedStock.toLocaleString()}
        subtitle="Requiring inspection"
      />
    </div>
  );
}
