import { PurchaseOrigin, PURCHASE_ORIGIN_META } from '@/lib/purchaseOrigin';
import { cn } from '@/lib/utils';

interface PurchaseOriginBadgeProps {
  origin?: PurchaseOrigin | string | null;
  className?: string;
}

/**
 * Colored badge for a purchase's origin. Domestic = green, International = blue.
 * Renders a neutral em-dash when the origin is unset (e.g. legacy/in-flight RFQs
 * awarded before this feature shipped).
 */
export function PurchaseOriginBadge({ origin, className }: PurchaseOriginBadgeProps) {
  const meta = origin ? PURCHASE_ORIGIN_META[origin as PurchaseOrigin] : undefined;

  if (!meta) {
    return <span className={cn('text-xs text-slate-400', className)}>—</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
