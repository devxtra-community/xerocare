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
  const res = await api.get('/b/invoices/nav-counts', { skipErrorToast: true });
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
 * The employee sidebar's own reading of the shared sales titles.
 *
 * Rent / Lease / Sale / Quotations name the same pages for everyone, but the queue behind
 * them differs by who is looking: Finance is waiting on deals the employee has approved and
 * passed up, while the employee is waiting on deals the customer has accepted or Finance has
 * sent back. Without this the employee's dots tracked Finance's inbox — lighting up for work
 * they had already finished and staying dark for work that was theirs.
 *
 * Passed to `navCountFor` as `overrides`; every other title falls through to NAV_BADGE_KEYS.
 */
export const EMPLOYEE_BADGE_OVERRIDES: Record<string, string | string[]> = {
  Quotations: 'QUOTATIONS_EMPLOYEE',
  Rent: 'RENT_EMPLOYEE',
  Lease: 'LEASE_EMPLOYEE',
  Sales: 'SALE_EMPLOYEE',
  Sale: 'SALE_EMPLOYEE',
  Orders: ['RENT_EMPLOYEE', 'LEASE_EMPLOYEE', 'SALE_EMPLOYEE'],
};

/**
 * What the Service entry means to a technician.
 *
 * The default SERVICE_TICKETS key counts OPEN (unclaimed) tickets, which is the service
 * desk's queue — a technician's sidebar went dark the moment a ticket was assigned to them.
 * Theirs counts the tickets actually on their name and awaiting their move.
 */
export const TECHNICIAN_BADGE_OVERRIDES: Record<string, string | string[]> = {
  Service: 'SERVICE_TICKETS_TECHNICIAN',
  Tickets: 'SERVICE_TICKETS_TECHNICIAN',
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
 * The override map a menu entry should use, chosen from where it links.
 *
 * Sidebars that span more than one desk (the Manager's, which lists the employee pages
 * under "Sales Desk" and the Finance pages under "Finance Desk") carry two entries with the
 * same title but opposite meanings — there is an "Orders" in each. Title alone cannot tell
 * them apart, so the destination decides: an entry pointing into /employee is the employee's
 * queue, anything else keeps the default.
 */
export function badgeOverridesForHref(
  href?: string,
): Record<string, string | string[]> | undefined {
  return href?.startsWith('/employee') ? EMPLOYEE_BADGE_OVERRIDES : undefined;
}

/**
 * Roll a group's children up onto its parent, resolving each child's overrides from its own
 * href. Used where one collapsible group mixes desks, so the collapsed parent's dot counts
 * each child against the queue that child actually watches.
 */
export function navCountForEntries(
  entries: Array<{ title?: string; href?: string }>,
  counts: NavCounts,
): number {
  return entries.reduce<number>(
    (sum, e) => sum + (e.title ? navCountFor(e.title, counts, badgeOverridesForHref(e.href)) : 0),
    0,
  );
}
