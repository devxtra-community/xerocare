'use client';

import { usePathname } from 'next/navigation';

/**
 * Route prefix for the accounts section the viewer is currently in.
 *
 * The same accounts pages are served under three prefixes — Finance, Branch Manager and
 * Admin each have their own section with its own layout guard. A drill-down link that
 * hardcodes one prefix sends the other roles straight into that guard, which redirects
 * them back out; deriving the prefix from the current path keeps every link inside the
 * section the viewer is already in.
 */
export function useAccountsBasePath(): string {
  const pathname = usePathname();
  if (pathname?.startsWith('/manager/')) return '/manager/accounts';
  if (pathname?.startsWith('/admin/')) return '/admin/accounts';
  return '/finance/accounts';
}
