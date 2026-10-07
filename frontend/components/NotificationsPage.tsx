'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import api from '@/lib/api';
import { formatNotificationTime } from '@/lib/format';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  createdAt: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  TEMPLATE_ASSIGNED: '📋',
  TEMPLATE_CREATED: '📋',
  TEMPLATE_EDITED: '✏️',
  TEMPLATE_DELETED: '🗑️',
  TEMPLATE_RETAKEN: '↩️',
  QUOTATION_SUBMITTED: '📤',
  QUOTATION_APPROVED: '✅',
  QUOTATION_REJECTED: '❌',
  CUSTOMER_ACCEPTED: '🤝',
  CUSTOMER_REJECTED: '❌',
  CONTRACT_ACTIVATED: '🤝',
  WARNING: '⚠️',
  CRITICAL_WARNING: '🚨',
  EXPIRY: '🔴',
  PAYMENT_RECORDED: '💳',
  DIRECT_SALE_UNPAID: '💰',
  TICKET_CREATED: '🔧',
  TECHNICIAN_ASSIGNED: '👷',
  TICKET_COMPLETED: '✅',
  LOW_STOCK_ALERT: '📦',
  LEAVE_SUBMITTED: '📝',
  LEAVE_APPROVED: '🏖️',
  LEAVE_REJECTED: '❌',
  SALARY_PAID: '💰',
  VENDOR_QUOTE_RECEIVED: '📩',
  RFQ_FULLY_QUOTED: '📊',
  RFQ_AWARDED: '🏆',
  LOT_RECEIVED: '📦',
  INFO: '🔔',
  TASK: '📋',
};

function getIcon(type: string) {
  return TYPE_ICONS[type] || '🔔';
}

type FilterType = 'ALL' | 'UNREAD';

/**
 * Where a notification's "Go" button should take the signed-in user.
 *
 * `path` is always a page that actually exists for the role reading the
 * notification — the routes below mirror the sidebar hrefs (which is why Admin
 * is sent to /manager/opening-balances and Managers to /employee/service).
 * A role with no such page resolves to `null`, and the button is simply not
 * rendered instead of bouncing the user off a 404 or middleware redirect.
 */
interface NotificationTarget {
  path: string;
  label: string;
}

const SERVICE_PAGE: Record<string, string | null> = {
  admin: '/admin/service',
  employee: '/employee/service',
  manager: '/employee/service',
  finance: '/finance/service-estimates',
  hr: null,
};

const SERVICE_CONTRACT_PAGE: Record<string, string | null> = {
  admin: '/employee/service/contracts',
  employee: '/employee/service/contracts',
  manager: '/employee/service/contracts',
  finance: '/finance/contract-renewals',
  hr: null,
};

const SALES_PAGE: Record<string, string | null> = {
  admin: '/admin/sales',
  employee: '/employee/sales',
  manager: '/manager/sales',
  finance: '/finance/quotations',
  hr: null,
};

const CONTRACT_PAGE: Record<string, string | null> = {
  admin: '/admin/sales',
  employee: '/employee/sales',
  manager: '/manager/sales',
  finance: '/finance/contract-renewals',
  hr: null,
};

const RENT_PAGE: Record<string, string | null> = {
  admin: '/finance/rent',
  employee: '/employee/rent',
  manager: '/finance/rent',
  finance: '/finance/rent',
  hr: null,
};

const LEASE_PAGE: Record<string, string | null> = {
  admin: '/finance/lease',
  employee: '/employee/lease',
  manager: '/finance/lease',
  finance: '/finance/lease',
  hr: null,
};

const OPENING_BALANCE_PAGE: Record<string, string | null> = {
  admin: '/manager/opening-balances',
  employee: '/employee/opening-balances',
  manager: '/manager/opening-balances',
  finance: '/finance/opening-balances',
  hr: null,
};

const RFQ_PAGE: Record<string, string | null> = {
  admin: '/admin/rfqs',
  manager: '/manager/rfqs',
  employee: null,
  finance: null,
  hr: null,
};

const RFQ_CREATE_PAGE: Record<string, string | null> = {
  admin: '/admin/rfqs/create',
  manager: '/manager/rfqs/create',
  employee: null,
  finance: null,
  hr: null,
};

const LEAVE_PAGE: Record<string, string | null> = {
  admin: '/hr/leave',
  manager: '/hr/leave',
  hr: '/hr/leave',
  employee: '/employee/leave',
  finance: null,
};

const PAYROLL_PAGE: Record<string, string | null> = {
  admin: '/hr/payroll',
  manager: '/hr/payroll',
  hr: '/hr/payroll',
  employee: null,
  finance: null,
};

const TABLES: Record<string, Record<string, string | null>> = {
  STOCK_TRANSFER: {
    admin: '/admin/stock-transfers',
    manager: '/manager/stock-transfers',
    employee: null,
    finance: null,
    hr: null,
  },
  CHEQUE: {
    admin: '/admin/accounts/cheques',
    manager: '/manager/accounts/cheques',
    finance: '/finance/accounts/cheques',
    employee: null,
    hr: null,
  },
  TARGET: {
    admin: '/manager/targets',
    manager: '/manager/targets',
    employee: null,
    finance: null,
    hr: null,
  },
  MACHINE_SWAP: {
    admin: '/manager/machine-swaps',
    manager: '/manager/machine-swaps',
    employee: null,
    finance: null,
    hr: null,
  },
  LOT: { admin: '/admin/lots', manager: '/manager/lots', employee: null, finance: null, hr: null },
  INVENTORY: {
    admin: '/admin/inventory',
    manager: '/manager/inventory',
    employee: null,
    finance: null,
    hr: null,
  },
  RETURNS: {
    admin: '/admin/sales/returns',
    manager: '/manager/sales/returns',
    employee: '/employee/sales/returns',
    finance: '/finance/returns',
    hr: null,
  },
};

const REFERENCE_LABELS: Record<string, string> = {
  SERVICE_TICKET: 'Service ticket',
  SERVICE: 'Service',
  SERVICE_CONTRACT: 'Service contract',
  QUOTATION: 'Quotation',
  TEMPLATE: 'Quotation template',
  CONTRACT: 'Contract',
  OPENING_BALANCE: 'Opening balance',
  CUSTOM_PART_REQUEST: 'Custom part request',
  STOCK_TRANSFER: 'Stock transfer',
  CHEQUE: 'Cheque',
  TARGET: 'Target',
  MACHINE_SWAP: 'Machine swap',
  CREDIT_NOTE: 'Credit note',
  RENT: 'Rent order',
  LEASE: 'Lease order',
  ORDER: 'Order',
};

function pick(role: string, table: Record<string, string | null>): string | null {
  return table[role] ?? null;
}

/** "TICKET_CREATED" -> "Ticket created" (notification type badge / related-to row). */
function humanizeType(type?: string | null): string {
  if (!type) return 'Notification';
  const words = type.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

function formatFullTime(value?: string | null): string {
  const date = value ? new Date(value) : null;
  return date && !isNaN(date.getTime()) ? format(date, 'dd MMM yyyy, hh:mm a') : 'Unknown date';
}

/**
 * Resolves the page a notification points at for the *signed-in* role.
 *
 * Order matters: a structured service reference always wins (a Rent-covered
 * machine still produces a Service ticket notification, and that belongs on the
 * service page), then the wording is checked for rent/lease — there is no
 * `referenceType` for those yet — and only then the notification `type`.
 */
function resolveTarget(notif: Notification, role: string): NotificationTarget | null {
  const refId = (notif.data?.referenceId as string) || '';
  const refType = ((notif.data?.referenceType as string) || '').toUpperCase();
  const type = (notif.type || '').toUpperCase();
  const text = `${notif.title} ${notif.message}`;

  const fromTable = (
    table: Record<string, string | null>,
    label: string,
  ): NotificationTarget | null => {
    const path = pick(role, table);
    return path ? { path, label } : null;
  };

  const isServiceRef =
    refType === 'SERVICE' || refType === 'SERVICE_TICKET' || refType === 'CUSTOM_PART_REQUEST';

  if (!isServiceRef) {
    if (/\brent(al)?\b/i.test(text)) {
      const target = fromTable(RENT_PAGE, 'Go to rent');
      if (target) return target;
    }
    if (/\bleas(e|ed|ing|es)\b/i.test(text)) {
      const target = fromTable(LEASE_PAGE, 'Go to lease');
      if (target) return target;
    }
  }

  switch (refType) {
    case 'SERVICE_TICKET':
    case 'SERVICE':
      return fromTable(SERVICE_PAGE, 'Go to service tickets');
    case 'SERVICE_CONTRACT': {
      const base = pick(role, SERVICE_CONTRACT_PAGE);
      if (!base) return null;
      return { path: refId ? `${base}/${refId}` : base, label: 'Open service contract' };
    }
    case 'QUOTATION':
    case 'TEMPLATE':
      return fromTable(SALES_PAGE, 'View quotation');
    case 'CONTRACT':
      return fromTable(CONTRACT_PAGE, 'View contract');
    case 'OPENING_BALANCE':
      return fromTable(OPENING_BALANCE_PAGE, 'View opening balances');
    case 'CUSTOM_PART_REQUEST': {
      const base = pick(role, RFQ_CREATE_PAGE);
      if (!base) return null;
      return { path: refId ? `${base}?fromServiceTicket=${refId}` : base, label: 'Open RFQ' };
    }
    case 'STOCK_TRANSFER':
      return fromTable(TABLES.STOCK_TRANSFER, 'View stock transfers');
    case 'CHEQUE':
      return fromTable(TABLES.CHEQUE, 'View cheques');
    case 'TARGET':
      return fromTable(TABLES.TARGET, 'View targets');
    case 'MACHINE_SWAP':
      return fromTable(TABLES.MACHINE_SWAP, 'View machine swaps');
    case 'CREDIT_NOTE':
      return fromTable(TABLES.RETURNS, 'View returns');
    case 'RENT':
      return fromTable(RENT_PAGE, 'Go to rent');
    case 'LEASE':
      return fromTable(LEASE_PAGE, 'Go to lease');
    default:
      break;
  }

  // No usable reference payload — fall back to what the notification is about.
  if (type.startsWith('LEAVE_')) return fromTable(LEAVE_PAGE, 'View leave requests');
  if (type.startsWith('PAYROLL') || type === 'SALARY_PAID')
    return fromTable(PAYROLL_PAGE, 'View payroll');
  if (type.startsWith('RFQ_') || type === 'VENDOR_QUOTE_RECEIVED')
    return fromTable(RFQ_PAGE, 'View RFQs');
  if (type.startsWith('LOT_')) return fromTable(TABLES.LOT, 'View lots');
  if (type === 'LOW_STOCK_ALERT') return fromTable(TABLES.INVENTORY, 'View inventory');
  if (
    type.startsWith('QUOTATION_') ||
    type.startsWith('TEMPLATE_') ||
    type.startsWith('CUSTOMER_')
  ) {
    return fromTable(SALES_PAGE, 'View sales');
  }
  if (type === 'CONTRACT_ACTIVATED' || type === 'DIRECT_SALE_UNPAID')
    return fromTable(CONTRACT_PAGE, 'View sales');
  if (type.startsWith('SERVICE') || type.startsWith('TICKET_') || type === 'TECHNICIAN_ASSIGNED') {
    return fromTable(SERVICE_PAGE, 'Go to service tickets');
  }

  return null;
}

export default function NotificationsPage({ role }: { role: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [loading, setLoading] = useState(true);
  // Notification whose detail dialog is open (full description + Go button).
  const [selected, setSelected] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/e/notifications/my');
      const data = response.data;
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/e/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      // Keep the open dialog in sync — it holds its own copy of the notification.
      setSelected((prev) => (prev && prev.id === id ? { ...prev, is_read: true } : prev));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/e/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  // Clicking a card opens its detail dialog — the un-clamped description and the
  // navigation button both live there (the list row keeps its 2-line preview).
  const openNotification = (notif: Notification) => {
    setSelected(notif);
    if (!notif.is_read) markAsRead(notif.id);
  };

  const goToTarget = () => {
    if (!selected) return;
    const target = resolveTarget(selected, role);
    if (!target) return;
    if (!selected.is_read) markAsRead(selected.id);
    setSelected(null);
    router.push(target.path);
  };

  const filtered = filter === 'UNREAD' ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="bg-primary/10 min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary uppercase tracking-wide">
              Notifications
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter tabs */}
            <div className="flex bg-card rounded-lg border border-border p-0.5 text-xs">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  filter === 'ALL'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  filter === 'UNREAD'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-primary text-primary hover:bg-primary/5 gap-1.5"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-primary font-semibold animate-pulse text-sm">
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Bell className="h-12 w-12 opacity-20" />
            <p className="text-sm font-medium">
              {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onClick={() => openNotification(notif)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openNotification(notif);
                  }
                }}
                className={`w-full text-left rounded-xl p-4 border transition-all cursor-pointer ${
                  notif.is_read
                    ? 'bg-card border-border hover:border-border'
                    : 'bg-card border-primary/20 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon + unread dot */}
                  <div className="relative mt-0.5 shrink-0">
                    <span className="text-xl">{getIcon(notif.type)}</span>
                    {!notif.is_read && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-sm font-semibold leading-tight ${
                          notif.is_read ? 'text-foreground' : 'text-primary'
                        }`}
                      >
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                        {formatNotificationTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {/* Mark read button */}
                  {!notif.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif.id);
                      }}
                      className="shrink-0 mt-0.5 p-1 rounded-full hover:bg-primary/10 text-primary transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail dialog: full description + the button that navigates */}
        {selected &&
          (() => {
            const target = resolveTarget(selected, role);
            const refType = (selected.data?.referenceType as string) || '';
            const related = refType ? REFERENCE_LABELS[refType] || humanizeType(refType) : null;

            return (
              <Modal
                key={selected.id}
                isOpen
                onClose={() => setSelected(null)}
                title={selected.title}
                maxWidth="lg"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-base leading-none">{getIcon(selected.type)}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                      {humanizeType(selected.type)}
                    </span>
                    <span>{formatFullTime(selected.createdAt)}</span>
                    {!selected.is_read && (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 font-semibold text-warning">
                        Unread
                      </span>
                    )}
                  </div>

                  {/* Full description — never clamped here. */}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {selected.message}
                  </p>

                  {related && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <span>Related to</span>
                      <span className="font-semibold text-foreground">{related}</span>
                    </div>
                  )}

                  <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-border bg-card px-1 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs"
                      onClick={() => setSelected(null)}
                    >
                      Close
                    </Button>
                    {target && (
                      <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={goToTarget}>
                        {target.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Modal>
            );
          })()}
      </div>
    </div>
  );
}
