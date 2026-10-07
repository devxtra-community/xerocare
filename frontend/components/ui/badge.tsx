'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Status badges configuration
export const STATUS_MAP = {
  OPEN: {
    label: 'Open',
    className: 'bg-warning/10 text-warning border-warning/30 dark:bg-warning/30 dark:text-warning',
  },
  ASSIGNED: {
    label: 'Assigned',
    className: 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/30 dark:text-primary',
  },
  VISIT_SCHEDULED: {
    label: 'Visit Scheduled',
    className: 'bg-info/10 text-info border-info/30 dark:bg-info/30 dark:text-info',
  },
  DIAGNOSED: {
    label: 'Diagnosed',
    className: 'bg-lease/10 text-lease border-lease/30 dark:bg-lease/30 dark:text-lease',
  },
  QUOTED: {
    label: 'Quote Sent',
    className: 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/30 dark:text-primary',
  },
  WAITING_FINANCE_APPROVAL: {
    label: 'Waiting Finance Approval',
    className: 'bg-warning/10 text-warning border-warning/30 dark:bg-warning/30 dark:text-warning',
  },
  WAITING_FINANCE_APPROVAL_2: {
    label: 'Add. Work — Waiting Finance',
    className: 'bg-warning/10 text-warning border-warning/30 dark:bg-warning/30 dark:text-warning',
  },
  FINANCE_APPROVED_2: {
    label: 'Add. Work Approved',
    className: 'bg-info/10 text-info border-info/30 dark:bg-info/30 dark:text-info',
  },
  ESTIMATE_RECORDED: {
    label: 'Estimate Recorded',
    className: 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/30 dark:text-primary',
  },
  ADDITIONAL_ESTIMATE_PENDING: {
    label: 'Additional Estimate Pending',
    className: 'bg-warning/10 text-warning border-warning/30 dark:bg-warning/30 dark:text-warning',
  },
  REVISED: {
    label: 'Estimate Revised',
    className: 'bg-lease/10 text-lease border-lease/30 dark:bg-lease/30 dark:text-lease',
  },
  FINANCE_APPROVED: {
    label: 'Finance Approved',
    className: 'bg-info/10 text-info border-info/30 dark:bg-info/30 dark:text-info',
  },
  FINANCE_REJECTED: {
    label: 'Finance Rejected',
    className:
      'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/30 dark:text-destructive',
  },
  CUSTOMER_APPROVED: {
    label: 'Customer Approved',
    className: 'bg-success/10 text-success border-success/30 dark:bg-success/30 dark:text-success',
  },
  CUSTOMER_REJECTED: {
    label: 'Customer Declined',
    className:
      'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/30 dark:text-destructive',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/30 dark:text-primary',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-success/10 text-success border-success/30 dark:bg-success/30 dark:text-success',
  },
  CANCELLED: {
    label: 'Cancelled',
    className:
      'bg-muted text-foreground border-border dark:bg-foreground dark:text-muted-foreground',
  },
  FREE_SERVICE: {
    label: 'Free Service',
    className: 'bg-success/10 text-success border-success/30 dark:bg-success/30 dark:text-success',
  },
} as const;

// Context/Service Context configuration — keys must match the backend ServiceContext
// enum (backend/ven_inv_service/src/entities/serviceTicketEntity.ts)
export const CONTEXT_MAP = {
  CHARGEABLE: { label: 'Chargeable', className: 'bg-warning/10 text-warning border-warning/30' },
  RENT: { label: 'Rent — Free', className: 'bg-success/10 text-success border-success/30' },
  WARRANTY: {
    label: 'Under Warranty',
    className: 'bg-success/10 text-success border-success/30',
  },
  LEASE_UNDER_WARRANTY: {
    label: 'Lease — Under Warranty',
    className: 'bg-success/10 text-success border-success/30',
  },
  LEASE_CPC: {
    label: 'Lease CPC — Free',
    className: 'bg-success/10 text-success border-success/30',
  },
  LEASE_EXPIRED: {
    label: 'Warranty Expired',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  AMC: { label: 'AMC Contract', className: 'bg-primary/10 text-primary border-primary/30' },
  FSMA: { label: 'FSMA Contract', className: 'bg-primary/10 text-primary border-primary/30' },
  SMA: { label: 'SMA Contract', className: 'bg-primary/10 text-primary border-primary/30' },
  EXTERNAL_MACHINE: {
    label: 'External Machine',
    className: 'bg-muted text-foreground border-border',
  },
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
        'bg-muted text-foreground border-border dark:bg-foreground/30 dark:text-muted-foreground',
    };
    return (
      <div
        title={config.label}
        className={cn(
          'inline-flex items-center max-w-full truncate rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
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
        'bg-muted text-foreground border-border dark:bg-foreground/30 dark:text-muted-foreground',
    };
    return (
      <div
        title={config.label}
        className={cn(
          'inline-flex items-center max-w-full truncate rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
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
