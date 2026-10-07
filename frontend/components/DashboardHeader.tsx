'use client';

import {
  Bell,
  HelpCircle,
  ChevronDown,
  Menu,
  LogOut,
  Key,
  Monitor,
  User,
  Moon,
  Sun,
} from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';
import { getProfile, logout, getUserFromToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatNotificationTime } from '@/lib/format';
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
import { HelpGuideDialog } from './HelpGuideDialog';
import { initBranchCurrency } from '@/lib/currency';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown>;
  is_read: boolean;
  createdAt: string | null;
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
    role: '',
    profile_image_url: '',
  });

  const [rawRole, setRawRole] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSessionsDialogOpen, setIsSessionsDialogOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('xerocare-theme');
    const darkMode = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark', darkMode);
    setIsDarkMode(darkMode);
  }, []);

  const toggleTheme = () => {
    const nextDarkMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', nextDarkMode);
    window.localStorage.setItem('xerocare-theme', nextDarkMode ? 'dark' : 'light');
    setIsDarkMode(nextDarkMode);
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/e/notifications/my', { skipErrorToast: true });
      const data = response.data;
      // Support both old array shape and new { notifications, unreadCount } shape
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      } else {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        if (res.success && res.data) {
          const { first_name, last_name, name, email, role, profile_image_url } = res.data;

          const formattedRole = role
            ? role === 'HR' || role === 'IT'
              ? role
              : role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
            : '';

          const fullName =
            name ||
            (first_name
              ? `${first_name}${last_name ? ' ' + last_name : ''}`
              : formattedRole || 'User');
          setUser({
            name: fullName,
            email: email || '',
            initial: fullName.charAt(0).toUpperCase(),
            role: formattedRole,
            profile_image_url: profile_image_url || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchProfile();
    setRawRole(getUserFromToken()?.role || '');
    fetchNotifications();
    initBranchCurrency();

    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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

  const handleSeeProfile = () => {
    const tokenUser = getUserFromToken();
    if (!tokenUser) return;

    if (tokenUser.role === 'HR') {
      router.push(`/hr/employees/${tokenUser.userId}`);
    } else if (tokenUser.role === 'MANAGER') {
      router.push(`/manager/employees/${tokenUser.userId}`);
    } else if (tokenUser.role === 'EMPLOYEE') {
      router.push('/employee/profile');
    } else if (tokenUser.role === 'FINANCE') {
      router.push('/finance/profile');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Hard navigation resets all JS memory (including React Query cache) so
      // the next user on this browser never sees stale data from a prior session.
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to logout', error);
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div
        className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 gap-2"
        suppressHydrationWarning
      >
        <div className="flex items-center gap-2" suppressHydrationWarning>
          <SidebarTrigger className="lg:hidden text-foreground hover:bg-primary/10 hover:text-primary">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <h1 className="text-base sm:text-lg font-medium text-foreground">{title}</h1>
        </div>

        {/* Right: Icons and User Profile */}
        <div className="flex items-center gap-2 sm:gap-4" suppressHydrationWarning>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted dark:border-border dark:bg-foreground dark:text-warning dark:hover:bg-foreground"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDarkMode}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild id="notification-trigger">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 data-[state=open]:border-primary/30 data-[state=open]:bg-primary/10"
                suppressHydrationWarning
              >
                <Bell className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-border bg-destructive px-1 text-[9px] font-semibold leading-none text-destructive-foreground shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 bg-card text-foreground max-h-[400px] overflow-y-auto"
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
              {(() => {
                const unread = notifications.filter((n) => !n.is_read);
                if (unread.length === 0) {
                  return (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      {notifications.length === 0 ? 'No notifications yet' : "You're all caught up"}
                    </div>
                  );
                }
                return unread.slice(0, 8).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-primary/5 focus:text-foreground ${!notification.is_read ? 'bg-primary/5' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span
                        className={`font-semibold text-sm ${!notification.is_read ? 'text-primary' : ''}`}
                      >
                        {notification.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">{notification.message}</p>
                    {!notification.is_read && (
                      <div className="mt-1 flex w-full justify-end">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                    )}
                  </DropdownMenuItem>
                ));
              })()}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex justify-center p-3 text-xs font-semibold text-primary cursor-pointer hover:bg-primary/5"
                onClick={() => {
                  const role = user.role.toLowerCase();
                  router.push(`/${role}/notifications`);
                }}
              >
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help (hidden on mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex text-foreground hover:bg-primary/10 hover:text-primary"
            onClick={() => setIsHelpDialogOpen(true)}
            title="About Xerocare"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild id="user-menu-trigger">
              <Button
                variant="ghost"
                className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-border hover:bg-muted py-2 px-1 rounded-md transition-colors h-auto"
                suppressHydrationWarning
              >
                <div
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs sm:text-sm font-semibold shrink-0 overflow-hidden relative"
                  suppressHydrationWarning
                >
                  {user.profile_image_url ? (
                    <Image
                      src={user.profile_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                  ) : (
                    user.initial
                  )}
                </div>
                <div
                  className="hidden sm:flex flex-col min-w-0 items-start"
                  suppressHydrationWarning
                >
                  <div className="flex items-center gap-1.5 max-w-full">
                    <span className="text-sm font-medium truncate text-foreground">
                      {user.name}
                    </span>
                    {user.role && (
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap shrink-0">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
                <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 p-2 bg-card border-border shadow-xl rounded-2xl"
            >
              <div className="flex items-center gap-3 p-3 mb-1 bg-muted rounded-xl">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0 shadow-sm overflow-hidden relative">
                  {user.profile_image_url ? (
                    <Image
                      src={user.profile_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                  ) : (
                    user.initial
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 max-w-full">
                    <span className="text-sm font-bold text-foreground truncate">{user.name}</span>
                    {user.role && (
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate font-medium">
                    {user.email}
                  </span>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1 opacity-50" />

              <div className="space-y-1">
                {rawRole === 'ADMIN' ? (
                  <>
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
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={handleSeeProfile}
                    className="rounded-lg px-3 py-2.5 focus:bg-accent focus:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <User className="mr-3 h-4 w-4" />
                    <span className="text-sm font-medium">See Profile</span>
                  </DropdownMenuItem>
                )}
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
      <HelpGuideDialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen} />
    </header>
  );
}
