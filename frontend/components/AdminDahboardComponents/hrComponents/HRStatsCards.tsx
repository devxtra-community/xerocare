'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getHRStats, HRStats } from '@/lib/employee';
import { Loader2 } from 'lucide-react';

/**
 * Component displaying key HR statistics cards.
 * Shows total employees, active rate, and department counts.
 * Provides quick insights into workforce size and health.
 */
export default function HRStatsCards() {
  const [stats, setStats] = useState<HRStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getHRStats();
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch HR stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Employees',
      value: stats?.total?.toString() || '0',
      subtitle: 'Total registered staff',
    },
    {
      title: 'Active / Inactive',
      value: `${stats?.active || 0} / ${stats?.inactive || 0}`,
      subtitle: `${stats?.total ? Math.round((stats.active / stats.total) * 100) : 0}% Active rate`,
    },
    {
      title: 'Management Team',
      value: (stats?.byRole?.MANAGER || 0).toString(),
      subtitle: 'Managers & Above',
    },
    {
      title: 'HR & Admin',
      value: ((stats?.byRole?.HR || 0) + (stats?.byRole?.ADMIN || 0)).toString(),
      subtitle: 'Administrative staff',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((stat, index) => (
        <StatCard key={index} title={stat.title} value={stat.value} subtitle={stat.subtitle} />
      ))}
    </div>
  );
}
