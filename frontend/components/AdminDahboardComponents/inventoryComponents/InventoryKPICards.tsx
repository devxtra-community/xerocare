'use client';
import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { inventoryService, InventoryStats } from '@/services/inventoryService';

/**
 * Component displaying key inventory performance indicators (KPIs).
 * Shows total stock count, damaged items, unique model count, and total inventory valuation.
 * Provides a high-level financial and operational summary of inventory.
 */
export default function InventoryKPICards() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await inventoryService.getInventoryStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `₹ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `₹ ${(value / 1000).toFixed(1)}K`;
    }
    return `₹ ${value.toLocaleString()}`;
  };

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
        title="Total Stock"
        value={stats?.totalStock.toLocaleString() || '0'}
        subtitle="Combined active items"
      />
      <StatCard
        title="Damaged Products"
        value={stats?.damagedStock.toLocaleString() || '0'}
        subtitle="Requires attention"
      />
      <StatCard
        title="Total Product Models"
        value={stats?.productModels.toLocaleString() || '0'}
        subtitle="Unique printer models"
      />
      <StatCard
        title="Total Stock Value"
        value={formatCurrency(stats?.totalValue || 0)}
        subtitle="Inventory valuation"
      />
    </div>
  );
}
