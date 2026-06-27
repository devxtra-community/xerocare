'use client';

import React from 'react';

interface ContractProgressBarProps {
  completed: number;
  total: number;
}

export default function ContractProgressBar({ completed, total }: ContractProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>
          Progress: {completed} / {total} Months
        </span>
        <span className="font-semibold text-primary">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
