import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Returns a function with a permanently stable identity that always calls the latest
 * `fn`.
 *
 * For callback props used inside a data-loading effect. Parents usually pass them inline
 * (`onClose={() => setOpen(null)}`), so their identity changes on every parent render —
 * and a parent with a live timer re-renders every second. An effect listing such a prop
 * in its deps then cancelled and restarted its fetch each tick; any request slower than
 * the tick never finished, leaving the modal on its spinner forever (the technician's
 * Record Replacement Install on the Replacement Requests tab).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  const stable = useCallback((...args: Parameters<T>) => ref.current(...args), []);
  return stable as unknown as T;
}
