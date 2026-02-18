'use client';

import { Search, Bell, HelpCircle, ChevronDown, Menu, LogOut, Key, Monitor } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';
import { getProfile, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { SessionsDialog } from './SessionsDialog';
import { SalaryDetailsDialog } from './SalaryDetailsDialog';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown>;
  is_read: boolean;
  createdAt: string;
}

/**
 * Global dashboard header component.
 * Contains search, notifications, user profile menu, and access to account settings.
 */
export default function DashboardHeader({ title = 'Dashboard' }: { title?: string }) {
  const router = useRouter();
  const [user, setUser] = useState({
    name: '',
    email: '',
    initial: '',
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSessionsDialogOpen, setIsSessionsDialogOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/e/notifications/my');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: Notification) => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        if (res.success && res.data) {
          const { first_name, last_name, name, email } = res.data;
          const fullName =
            name || (first_name ? `${first_name}${last_name ? ' ' + last_name : ''}` : 'User');
          setUser({
            name: fullName,
            email: email || '',
            initial: fullName.charAt(0).toUpperCase(),
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchProfile();
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/e/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/e/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.type === 'SALARY_PAID') {
      const payrollId = (notification.data as { payroll_id?: string } | undefined)?.payroll_id;

      if (payrollId) {
        setSelectedPayrollId(payrollId);
        setIsSalaryDialogOpen(true);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-sidebar text-white">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 gap-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="lg:hidden text-white hover:bg-card/10">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <h1 className="text-base sm:text-lg font-semibold">{title}</h1>
        </div>

        {/* Center: Search bar (hidden on mobile) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search"
              className="w-full pl-10 pr-4 bg-card/10 border-white/20 text-white placeholder:text-gray-300 focus-visible:ring-white/50"
            />
          </div>
        </div>

        {/* Right: Icons and User Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-card/10 h-8 w-8 sm:h-10 sm:w-10 relative"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 bg-card text-black max-h-[400px] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-2">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-primary hover:text-primary/80"
                    onClick={markAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No notifications yet</div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-primary/5 ${!notification.is_read ? 'bg-primary/5' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span
                        className={`font-semibold text-sm ${!notification.is_read ? 'text-primary' : ''}`}
                      >
                        {notification.title}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                    {!notification.is_read && (
                      <div className="mt-1 flex w-full justify-end">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help (hidden on mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex text-white hover:bg-card/10"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-white/20 hover:bg-card/5 py-2 px-1 rounded transition-colors h-auto"
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/20 flex items-center justify-center text-xs sm:text-sm font-medium shrink-0">
                  {user.initial}
                </div>
                <div className="hidden sm:flex flex-col min-w-0 items-start">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-sidebar-foreground/70 truncate">{user.email}</span>
                </div>
                <ChevronDown className="hidden sm:block h-4 w-4 text-sidebar-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 p-2 bg-white border-slate-200 shadow-xl rounded-2xl"
            >
              <div className="flex items-center gap-3 p-3 mb-1 bg-slate-50 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                  {user.initial}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-900 truncate">{user.name}</span>
                  <span className="text-[10px] text-slate-500 truncate font-medium">
                    {user.email}
                  </span>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1 opacity-50" />

              <div className="space-y-1">
                <DropdownMenuItem
                  onClick={() => setIsSessionsDialogOpen(true)}
                  className="rounded-lg px-3 py-2.5 focus:bg-accent focus:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Monitor className="mr-3 h-4 w-4" />
                  <span className="text-sm font-medium">Session Info</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsPasswordDialogOpen(true)}
                  className="rounded-lg px-3 py-2.5 focus:bg-accent focus:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Key className="mr-3 h-4 w-4" />
                  <span className="text-sm font-medium">Change Password</span>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="my-1 opacity-50" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-lg px-3 py-2.5 text-danger focus:text-danger focus:bg-danger/10 cursor-pointer transition-colors"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="text-sm font-bold">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} />
      <SessionsDialog open={isSessionsDialogOpen} onOpenChange={setIsSessionsDialogOpen} />
      <SalaryDetailsDialog
        open={isSalaryDialogOpen}
        onOpenChange={setIsSalaryDialogOpen}
        payrollId={selectedPayrollId}
      />
    </header>
  );
}
