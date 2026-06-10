'use client';

import StatCard from '@/components/StatCard';

interface Stats {
  total: number;
  directRefund: number;
  replacement: number;
  creditExchange: number;
}

export default function ReturnsStatCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      title: 'Total Returns',
      value: String(stats.total),
      subtitle: 'All return types',
    },
    {
      title: 'Direct Refund',
      value: String(stats.directRefund),
      subtitle: 'Cash/Bank refunds',
    },
    {
      title: 'Replacement',
      value: String(stats.replacement),
      subtitle: 'Product exchanges',
    },
    {
      title: 'Exchange Credit',
      value: String(stats.creditExchange),
      subtitle: 'Wallet credits',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
