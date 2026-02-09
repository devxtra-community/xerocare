'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { Loader2 } from 'lucide-react';
import { getLeaveStats } from '@/lib/leaveApplicationService';
import { toast } from 'sonner';

export default function HRLeaveStats() {
  const [stats, setStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalApplications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await getLeaveStats();
        if (response.success) {
          setStats(response.data);
        }
      } catch {
        toast.error('Failed to load leave statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Pending Applications',
      value: stats.totalPending.toString(),
      subtitle: 'Waiting for action',
    },
    {
      title: 'Approved',
      value: stats.totalApproved.toString(),
      subtitle: 'Total approved',
    },
    {
      title: 'Rejected',
      value: stats.totalRejected.toString(),
      subtitle: 'Total rejected',
    },
    {
      title: 'Total Applications',
      value: stats.totalApplications.toString(),
      subtitle: 'All records',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-[80px] bg-card/50 animate-pulse rounded-2xl flex items-center justify-center"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary/30" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {statCards.map((stat) => (
        <StatCard key={stat.title} title={stat.title} value={stat.value} subtitle={stat.subtitle} />
      ))}
    </div>
  );
}
