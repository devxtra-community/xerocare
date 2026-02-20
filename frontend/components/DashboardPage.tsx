'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardPageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A wrapper component for dashboard pages to ensure consistent padding,
 * spacing, and maximum width across different sections.
 */
export default function DashboardPage({ children, className }: DashboardPageProps) {
  return (
    <div className={cn('p-4 sm:p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto', className)}>
      {children}
    </div>
  );
}
