/* eslint-disable @typescript-eslint/no-explicit-any -- deliberately permissive: this hook
   wraps any async action, so the argument tuple has to stay `any[]` for callers to pass
   their own typed functions without casts. */
import { useState, useCallback } from 'react';

// This hook wraps any async function and prevents it from
// running twice at the same time (prevents double-click bugs)
export function useAsyncAction<T>(action: (...args: any[]) => Promise<T>) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args: any[]) => {
      if (loading) return; // if already running, do nothing
      setLoading(true);
      try {
        const result = await action(...args);
        return result;
      } finally {
        setLoading(false); // always reset loading when done
      }
    },
    [loading, action],
  );

  return { execute, loading };
}
