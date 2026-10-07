import { AccountStatus } from '@/lib/finance/finance';
import { APInvoiceStatus } from '@/lib/finance/ap';
import { InvoiceStatus } from '@/lib/finance/ar';
import { cn } from '@/lib/utils';

type Props = {
  status: InvoiceStatus | APInvoiceStatus | AccountStatus;
  isOverdue?: boolean;
};

/**
 * Reusable badge component for displaying account or invoice status.
 * Color-coded based on status (PAID, UNPAID, OVERDUE, etc.).
 * Supports InvoiceStatus, APInvoiceStatus, and AccountStatus.
 */
export default function StatusBadge({ status, isOverdue }: Props) {
  return (
    <span
      className={cn(
        'px-2 py-1 text-sm rounded-md font-medium',

        status === 'Active' && 'bg-success/10 text-success border border-success/30',
        status === 'Inactive' && 'bg-muted text-foreground border border-border',
        status === 'Paid' && 'bg-success/10 text-success',
        status === 'Posted' && !isOverdue && 'bg-primary/10 text-primary',
        status === 'Draft' && 'bg-muted text-foreground',
        // status === 'Cancelled' && 'bg-destructive/10 text-destructive',
        status === 'Posted' && isOverdue && 'bg-destructive/10 text-destructive',
        status === 'Pending_Approval' && 'bg-warning/10 text-warning',
        status === 'Approved' && 'bg-primary/10 text-primary',
      )}
    >
      {isOverdue ? 'Overdue' : status.replace('_', ' ')}
    </span>
  );
}
