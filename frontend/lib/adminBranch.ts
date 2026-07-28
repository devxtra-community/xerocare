/**
 * Acting branch for ADMIN users.
 *
 * An admin belongs to the organisation, not to a branch, so its JWT carries no
 * `branchId`. Reads cope with that (the backend widens them to every branch),
 * but every write derives the owning branch from `req.user.branchId` and would
 * otherwise fail with "User context missing or incomplete".
 *
 * The admin therefore nominates a branch to act in. The choice is sent on every
 * request as the `X-Acting-Branch` header (see lib/api.ts) and the backend
 * honours it only when the *verified* token says the caller is an ADMIN — a
 * non-admin sending the header changes nothing.
 *
 * "All branches" (null) is the default and stays read-only: admin sees
 * organisation-wide data but cannot post an entry that has no owning branch.
 */

const STORAGE_KEY = 'adminActingBranchId';
const STORAGE_NAME_KEY = 'adminActingBranchName';

type Listener = () => void;

const listeners = new Set<Listener>();

let actingBranchId: string | null = null;
let actingBranchName: string | null = null;
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  try {
    actingBranchId = localStorage.getItem(STORAGE_KEY);
    actingBranchName = localStorage.getItem(STORAGE_NAME_KEY);
  } catch {
    /* private mode / storage disabled — stay on "all branches" */
  }
  hydrated = true;
}

/** Branch the admin is currently acting in, or null for "all branches". */
export function getActingBranchId(): string | null {
  hydrate();
  return actingBranchId;
}

/** Display name of the acting branch, for the header switcher. */
export function getActingBranchName(): string | null {
  hydrate();
  return actingBranchName;
}

/** Select a branch to act in. Pass null to return to organisation-wide reads. */
export function setActingBranch(id: string | null, name: string | null = null) {
  hydrate();
  actingBranchId = id;
  actingBranchName = name;

  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
      if (name) localStorage.setItem(STORAGE_NAME_KEY, name);
      else localStorage.removeItem(STORAGE_NAME_KEY);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_NAME_KEY);
    }
  } catch {
    /* ignore — the in-memory value still applies for this session */
  }

  listeners.forEach((l) => l());
}

/** Clear on logout so the next user does not inherit a stale branch. */
export function clearActingBranch() {
  setActingBranch(null, null);
  hydrated = false;
}

export function subscribeActingBranch(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
