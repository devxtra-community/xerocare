'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  createdAt: string;
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

export default function NotificationsPage({ role }: { role: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [loading, setLoading] = useState(true);

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

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);

    const refId = notif.data?.referenceId as string | undefined;
    const refType = notif.data?.referenceType as string | undefined;

    if (!refId || !refType) return;

    switch (refType) {
      case 'QUOTATION':
      case 'TEMPLATE':
        router.push(`/${role}/sales`);
        break;
      case 'CONTRACT':
        router.push(`/${role}/sales`);
        break;
      case 'SERVICE_TICKET':
      case 'SERVICE':
        router.push(`/${role}/service`);
        break;
      case 'OPENING_BALANCE':
        router.push(`/${role}/opening-balances`);
        break;
      default:
        break;
    }
  };

  const filtered = filter === 'UNREAD' ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="bg-blue-50 min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary uppercase tracking-wide">
              Notifications
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter tabs */}
            <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 text-xs">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  filter === 'ALL' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  filter === 'UNREAD'
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:text-gray-700'
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
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Bell className="h-12 w-12 opacity-20" />
            <p className="text-sm font-medium">
              {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-left rounded-xl p-4 border transition-all ${
                  notif.is_read
                    ? 'bg-white border-gray-100 hover:border-gray-200'
                    : 'bg-white border-primary/20 shadow-sm hover:shadow-md'
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
                          notif.is_read ? 'text-gray-700' : 'text-primary'
                        }`}
                      >
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
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
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
