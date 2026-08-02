'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      }),
  );

  // When the accessToken changes in localStorage (e.g. a different user logs in
  // on another tab), wipe the entire cache so stale branch-scoped data is never
  // served to the new user.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        queryClient.clear();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
