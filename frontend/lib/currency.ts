import { getMyBranch } from './branch';
import { getUserFromToken } from './auth';
import { getActingBranchId } from './adminBranch';

/**
 * Branch-settings singleton (currency + tax).
 *
 * The logged-in user's branch currency and tax rate are fetched once (at login
 * / dashboard mount) from a single /branch/my-branch call, cached in
 * localStorage and kept in module variables so that any code — components,
 * toast messages, chart formatters, product forms — can read them
 * synchronously via getActiveCurrency() / getBranchTaxPercent(). React
 * components that must re-render when they load should use the
 * useBranchCurrency() / useBranchTax() hooks.
 */

const STORAGE_KEY = 'branchCurrencyCode';
const TAX_STORAGE_KEY = 'branchTaxPercent';
export const FALLBACK_CURRENCY = 'AED';

let activeCurrency: string | null = null;
let activeTaxPercent: number | null = null;
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();
const taxListeners = new Set<() => void>();

function readStored(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readStoredTax(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TAX_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
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
 * Synchronous read of the branch tax rate, in percent. Branches with tax
 * switched off — and users with no branch context — read 0, which is also the
 * correct default for a tax-free branch.
 */
export function getBranchTaxPercent(): number {
  if (activeTaxPercent !== null) return activeTaxPercent;
  const stored = readStoredTax();
  if (stored !== null) {
    activeTaxPercent = stored;
    return stored;
  }
  return 0;
}

export function setBranchTaxPercent(percent: number) {
  const next = Number.isFinite(percent) ? percent : 0;
  if (next === activeTaxPercent) return;
  activeTaxPercent = next;
  try {
    localStorage.setItem(TAX_STORAGE_KEY, String(next));
  } catch {
    /* storage unavailable — module variable still set */
  }
  taxListeners.forEach((l) => l());
}

/** Clear on logout so the next user doesn't inherit a stale tax rate. */
export function clearBranchTaxPercent() {
  activeTaxPercent = null;
  try {
    localStorage.removeItem(TAX_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  taxListeners.forEach((l) => l());
}

/**
 * Fetch the logged-in user's branch and cache its currency.
 * Safe to call repeatedly — concurrent calls share one request.
 * Users without a branch (e.g. ADMIN) keep the fallback.
 */
export function initBranchCurrency(): Promise<void> {
  // /branch/my-branch resolves the branch from req.user.branchId, which comes
  // either from the token (MANAGER, HR, EMPLOYEE, FINANCE) or, for an ADMIN,
  // from the acting-branch header. An admin on "all branches" has neither, so
  // the request could only ever answer 400 — skip it and keep the fallback
  // rather than firing a guaranteed failure on every dashboard page.
  const hasBranchContext = Boolean(getUserFromToken()?.branchId || getActingBranchId());
  if (!hasBranchContext) return Promise.resolve();

  if (!fetchPromise) {
    // silent: an ADMIN has no branch and legitimately gets a 400 here. The
    // fallback currency covers that case, so the failure must not be toasted.
    fetchPromise = getMyBranch({ silent: true })
      .then((branch) => {
        if (branch?.currency_code) setActiveCurrency(branch.currency_code);
        // A branch with tax switched off charges 0%, so store that explicitly
        // rather than leaving a previous branch's rate cached. Only an explicit
        // has_tax === false zeroes it — older branch rows predate the flag and
        // are still described by their tax_percent.
        setBranchTaxPercent(branch?.has_tax === false ? 0 : Number(branch?.tax_percent) || 0);
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

export function subscribeBranchTax(listener: () => void) {
  taxListeners.add(listener);
  return () => taxListeners.delete(listener);
}
