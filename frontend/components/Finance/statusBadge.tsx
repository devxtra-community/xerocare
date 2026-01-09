import { cn } from '@/lib/utils';

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'px-2 py-1 text-xs rounded-md font-medium',
        status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
      )}
    >
      {status}
    </span>
  );
}
