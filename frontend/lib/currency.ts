import { getMyBranch } from './branch';

/**
 * Branch-currency singleton.
 *
 * The logged-in user's branch currency is fetched once (at login / dashboard
 * mount), cached in localStorage and kept in a module variable so that any
 * code — components, toast messages, chart formatters — can read it
 * synchronously via getActiveCurrency(). React components that must re-render
 * when it loads should use the useBranchCurrency() hook (hooks/useBranchCurrency).
 */

const STORAGE_KEY = 'branchCurrencyCode';
export const FALLBACK_CURRENCY = 'AED';

let activeCurrency: string | null = null;
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function readStored(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Synchronous read — falls back to the last stored value, then AED. */
export function getActiveCurrency(): string {
  if (activeCurrency) return activeCurrency;
  const stored = readStored();
  if (stored) {
    activeCurrency = stored;
    return stored;
  }
  return FALLBACK_CURRENCY;
}

export function setActiveCurrency(code: string) {
  if (!code || code === activeCurrency) return;
  activeCurrency = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage unavailable — module variable still set */
  }
  listeners.forEach((l) => l());
}

/** Clear on logout so the next user doesn't inherit a stale currency. */
export function clearActiveCurrency() {
  activeCurrency = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/**
 * Fetch the logged-in user's branch and cache its currency.
 * Safe to call repeatedly — concurrent calls share one request.
 * Users without a branch (e.g. ADMIN) keep the fallback.
 */
export function initBranchCurrency(): Promise<void> {
  if (!fetchPromise) {
    fetchPromise = getMyBranch()
      .then((branch) => {
        if (branch?.currency_code) setActiveCurrency(branch.currency_code);
      })
      .catch(() => {
        /* no branch / request failed — keep stored or fallback value */
      })
      .finally(() => {
        fetchPromise = null;
      });
  }
  return fetchPromise;
}

export function subscribeCurrency(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
