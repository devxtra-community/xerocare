import api from './api';

/**
 * Counts of work waiting for the signed-in user, keyed by queue.
 *
 * Merged by the gateway from every service that owns a queue, so a key may be absent
 * entirely when its service is unreachable — always read through `navCountFor`, which
 * treats missing as zero.
 */
export type NavCounts = Record<string, number>;

export const fetchNavCounts = async (): Promise<NavCounts> => {
  const res = await api.get('/b/invoices/nav-counts');
  return res.data?.data ?? {};
};

/**
 * Which queue each sidebar entry watches.
 *
 * Keyed by the menu item's own title so a sidebar needs no extra wiring per item — the
 * title it already renders is the lookup. Entries with no meaningful "waiting" state
 * (reports, catalogue pages, dashboards) are deliberately absent and simply never
 * show a dot.
 *
 * Where the same record queues for different people at different stages, the title maps
 * to that audience's own key rather than to a shared one — Finance's replacement queue
 * and the employee's are different sets of rows. A title may list several keys when the
 * one entry genuinely serves more than one desk, in which case its dot sums them.
 */
export const NAV_BADGE_KEYS: Record<string, string | string[]> = {
  // Sales pipeline — an employee has approved these and passed them on.
  Quotations: 'QUOTATIONS',
  'Quotation Approvals': 'QUOTATIONS',
  Rent: 'RENT',
  Lease: 'LEASE',
  Sale: 'SALE',
  Sales: 'SALE',
  // The Orders page is the combined view of the contract types above (it lists every
  // invoice past the draft stage), so its dot means "an order is waiting on someone".
  // Quotations are excluded — they have their own entry, and counting them here would
  // light Orders for rows that page does not treat as orders at all.
  Orders: ['RENT', 'LEASE', 'SALE'],

  // Billing
  Bills: 'BILLS',
  'Rent Collections': 'BILLS',
  'Lease Collections': 'BILLS',
  'Sale Collections': 'BILLS',

  // Service
  Service: 'SERVICE_TICKETS',
  Tickets: 'SERVICE_TICKETS',
  'Service Estimates': 'SERVICE_ESTIMATES',
  'Installation Requests': 'INSTALLATION_REQUESTS',

  // Machine replacement — one key per desk that has to act. The employee sidebar's entry
  // is shared by plain employees (who pick the unit once Finance approves) and the
  // service desk (which delivers it and assigns the technician), so it watches both:
  // whichever of them is looking, the dot means "something here is yours".
  'Machine Replacements': ['MACHINE_REPLACEMENTS_EMPLOYEE', 'MACHINE_REPLACEMENTS_SERVICE'],
  'Machine Swaps': 'MACHINE_REPLACEMENTS_FINANCE',
  'Renewals & Replacements': 'MACHINE_REPLACEMENTS_FINANCE',

  // Purchasing & stock
  RFQs: 'RFQS',
  'Stock Transfers': 'STOCK_TRANSFERS',

  // HR
  'Leave Approvals': 'LEAVE',
  'Leave Management': 'LEAVE',

  Notifications: 'NOTIFICATIONS',
};

/**
 * The count for a menu item, or 0 when it watches no queue.
 *
 * `overrides` lets one sidebar re-point a shared title at a different queue, for a title
 * that means something different in that role's menu than it does elsewhere.
 */
export function navCountFor(
  title: string,
  counts: NavCounts,
  overrides?: Record<string, string | string[]>,
): number {
  const key = overrides?.[title] ?? NAV_BADGE_KEYS[title];
  if (!key) return 0;
  const keys = Array.isArray(key) ? key : [key];
  return keys.reduce((sum, k) => sum + (counts[k] || 0), 0);
}

/**
 * Combined count for several menu titles at once.
 *
 * Used to roll a collapsible group's children up onto its parent, so a collapsed
 * "Sales Desk" still shows a dot when one of the entries hidden inside it has work
 * waiting — otherwise the badge would only ever be visible to someone who had already
 * opened the group and so had no need of it.
 */
export function navCountForTitles(
  titles: Array<string | undefined>,
  counts: NavCounts,
  overrides?: Record<string, string | string[]>,
): number {
  return titles.reduce<number>(
    (sum, title) => sum + (title ? navCountFor(title, counts, overrides) : 0),
    0,
  );
}
