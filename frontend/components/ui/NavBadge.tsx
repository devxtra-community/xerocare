import * as React from 'react';

/**
 * The red dot marking a sidebar entry that has work waiting behind it.
 *
 * Renders nothing at zero so callers can drop it in unconditionally. The count is not
 * printed — a dot answers "is there anything new here?", which is the question someone
 * scanning a sidebar is actually asking; the exact number is on the page itself. It is
 * exposed to screen readers via the title, since a bare colour cue conveys nothing to
 * anyone who cannot see it.
 */
export function NavBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  const label = count === 1 ? '1 item needs attention' : `${count} items need attention`;
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className="flex h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"
    />
  );
}
