import { AccountStatus } from '@/lib/finance/finance';
import { APInvoiceStatus } from '@/lib/finance/ap';
import { InvoiceStatus } from '@/lib/finance/ar';
import { cn } from '@/lib/utils';

type Props = {
  status: InvoiceStatus | APInvoiceStatus | AccountStatus;
  isOverdue?: boolean;
};

export default function StatusBadge({ status, isOverdue }: Props) {
  return (
    <span
      className={cn(
        'px-2 py-1 text-sm rounded-md font-medium',

        status === 'Active' && 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        status === 'Inactive' && 'bg-slate-100 text-slate-600 border border-slate-200',
        status === 'Paid' && 'bg-green-100 text-green-800',
        status === 'Posted' && !isOverdue && 'bg-blue-100 text-blue-800',
        status === 'Draft' && 'bg-gray-100 text-gray-800',
        // status === 'Cancelled' && 'bg-red-100 text-red-700',
        status === 'Posted' && isOverdue && 'bg-red-100 text-red-800',
        status === 'Pending_Approval' && 'bg-yellow-100 text-yellow-800',
        status === 'Approved' && 'bg-blue-100 text-blue-800',
      )}
    >
      {isOverdue ? 'Overdue' : status.replace('_', ' ')}
    </span>
  );
}
