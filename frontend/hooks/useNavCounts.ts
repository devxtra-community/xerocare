'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { fetchNavCounts, type NavCounts } from '@/lib/navCounts';

/** How often to re-check for new work while a sidebar is open. */
const POLL_MS = 30000;

/**
 * Sidebar badge counts, refreshed on a timer and whenever the user navigates.
 *
 * Navigating refetches because acting on something is what clears its dot — approve the
 * last pending quotation and the dot should be gone by the time the page renders, not up
 * to 30 seconds later.
 *
 * Failures are swallowed on purpose: the counts are a convenience, and a sidebar that
 * threw or toasted every time a poll failed would be worse than one that quietly shows
 * no dots. The previous counts are kept on failure so a single blip does not make every
 * dot disappear and reappear.
 */
export function useNavCounts(): NavCounts {
  const pathname = usePathname();
  const [counts, setCounts] = React.useState<NavCounts>({});

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchNavCounts();
        if (!cancelled) setCounts(data);
      } catch {
        // Keep whatever was last known — see the note above.
      }
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  return counts;
}
