'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Status badges configuration
export const STATUS_MAP = {
  OPEN: {
    label: 'Open',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  },
  ASSIGNED: {
    label: 'Assigned',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  },
  VISIT_SCHEDULED: {
    label: 'Visit Scheduled',
    className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400',
  },
  DIAGNOSED: {
    label: 'Diagnosed',
    className:
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
  },
  QUOTED: {
    label: 'Quote Sent',
    className:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
  },
  FINANCE_APPROVED: {
    label: 'Finance Approved',
    className: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400',
  },
  FINANCE_REJECTED: {
    label: 'Finance Rejected',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
  CUSTOMER_APPROVED: {
    label: 'Customer Approved',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  CUSTOMER_REJECTED: {
    label: 'Customer Declined',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-800 text-white border-green-900 dark:bg-green-950 dark:text-green-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
  },
  FREE_SERVICE: {
    label: 'Free Service',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
} as const;

// Context/Service Context configuration
export const CONTEXT_MAP = {
  CHARGEABLE: { label: 'Chargeable', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  RENT_CONTRACT: {
    label: 'Rent — Free',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  LEASE_WARRANTY: {
    label: 'Under Warranty',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  LEASE_EXPIRED: { label: 'Warranty Expired', className: 'bg-red-100 text-red-800 border-red-200' },
  AMC_CONTRACT: { label: 'AMC Contract', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  FSMA_CONTRACT: { label: 'FSMA Contract', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  SMA_CONTRACT: { label: 'SMA Contract', className: 'bg-blue-100 text-blue-800 border-blue-200' },
} as const;

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  status?: string;
  context?: string;
}

export function Badge({ className, variant, status, context, children, ...props }: BadgeProps) {
  if (status) {
    const config = STATUS_MAP[status as keyof typeof STATUS_MAP] || {
      label: status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      className:
        'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400',
    };
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
          config.className,
          className,
        )}
        {...props}
      >
        {config.label}
      </div>
    );
  }

  if (context) {
    const config = CONTEXT_MAP[context as keyof typeof CONTEXT_MAP] || {
      label: context
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      className:
        'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400',
    };
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
          config.className,
          className,
        )}
        {...props}
      >
        {config.label}
      </div>
    );
  }

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}
