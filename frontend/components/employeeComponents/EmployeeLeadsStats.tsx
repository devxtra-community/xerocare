import React from 'react';
import StatCard from '@/components/StatCard';
import { Lead } from '@/lib/lead';

interface EmployeeLeadsStatsProps {
  leads: Lead[];
}

/**
 * Statistical summary cards for employee lead metrics.
 * Displays total leads and breakdowns by source (Website, WhatsApp, Direct).
 */
/**
 * Statistical summary cards for employee lead metrics.
 * Displays total leads and breakdowns by source (Website, WhatsApp, Direct).
 * Helps analyze lead generation sources.
 */
export default function EmployeeLeadsStats({ leads }: EmployeeLeadsStatsProps) {
  const statsData = [
    { title: 'Total Leads', value: leads.length.toString() },
    {
      title: 'Website',
      value: leads.filter((l) => l.source?.toLowerCase() === 'website').length.toString(),
    },
    {
      title: 'WhatsApp',
      value: leads.filter((l) => l.source?.toLowerCase() === 'whatsapp').length.toString(),
    },
    {
      title: 'Direct',
      value: leads.filter((l) => l.source?.toLowerCase() === 'direct').length.toString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {statsData.map((stat, index) => (
        <StatCard key={index} title={stat.title} value={stat.value} />
      ))}
    </div>
  );
}
