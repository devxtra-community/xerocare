'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getSessions, logoutSession, logoutOtherDevices } from '@/lib/auth';
import { Laptop, Smartphone, Globe, LogOut, ShieldCheck, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Session {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  isCurrent: boolean;
}

interface SessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog component for managing active user sessions.
 * Allows viewing current sessions and logging out from specific or all devices.
 */
export function SessionsDialog({ open, onOpenChange }: SessionsDialogProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await getSessions();
      if (res.success) {
        setSessions(res.data);
      }
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSessions();
    }
  }, [open]);

  const handleLogoutSession = async (sessionId: string) => {
    try {
      const res = await logoutSession(sessionId);
      if (res.success) {
        toast.success('Session logged out');
        fetchSessions();
      }
    } catch {
      toast.error('Failed to logout session');
    }
  };

  const handleLogoutOtherDevices = async () => {
    try {
      const res = await logoutOtherDevices();
      if (res.success) {
        toast.success('Logged out from all other devices');
        fetchSessions();
      }
    } catch {
      toast.error('Failed to logout from other devices');
    }
  };

  const getDeviceIcon = (userAgent: string | null | undefined) => {
    if (!userAgent) return <Globe className="h-5 w-5" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (
      ua.includes('electron') ||
      ua.includes('windows') ||
      ua.includes('mac') ||
      ua.includes('linux') ||
      ua.includes('ubuntu')
    ) {
      return <Laptop className="h-5 w-5" />;
    }
    return <Globe className="h-5 w-5" />;
  };

  const getDeviceName = (userAgent: string) => {
    if (!userAgent) return 'Unknown Device';
    const ua = userAgent.toLowerCase();

    let os = 'Unknown OS';
    if (ua.includes('windows')) os = 'Windows PC';
    else if (ua.includes('mac')) os = 'Mac';
    else if (ua.includes('linux') || ua.includes('ubuntu')) os = 'Linux System';
    else if (ua.includes('android')) os = 'Android Device';
    else if (ua.includes('iphone')) os = 'iPhone';
    else if (ua.includes('ipad')) os = 'iPad';

    let browser = '';
    if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';

    return browser ? `${os} • ${browser}` : os;
  };

  // Deduplicate sessions: Group by UserAgent, prioritize 'isCurrent'
  const uniqueSessions = sessions.reduce((acc, current) => {
    const existingIndex = acc.findIndex((s) => s.userAgent === current.userAgent);

    if (existingIndex === -1) {
      acc.push(current);
    } else {
      // If found, keep the one that is current, or the key one (latest)
      if (current.isCurrent) {
        acc[existingIndex] = current;
      }
    }
    return acc;
  }, [] as Session[]);

  // Sort: Current device first, then others
  const sortedSessions = uniqueSessions.sort((a, b) =>
    a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Active Sessions</DialogTitle>
              <DialogDescription className="m-0">
                Manage devices where your account is currently logged in.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-2 pr-2 -mr-2">
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                <Globe className="h-8 w-8 mb-2 animate-pulse text-muted" />
                Loading active sessions...
              </div>
            ) : sortedSessions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No active sessions found.
              </div>
            ) : (
              sortedSessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                    session.isCurrent
                      ? 'bg-primary/5 border-primary/20 shadow-sm'
                      : 'bg-card hover:border-border/80 hover:bg-accent/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        session.isCurrent
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {getDeviceIcon(session.userAgent)}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tracking-tight text-foreground">
                          {getDeviceName(session.userAgent)}
                        </span>
                        {session.isCurrent && (
                          <Badge
                            variant="secondary"
                            className="pointer-events-none text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20"
                          >
                            Current Device
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:text-sm">
                        <span className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 opacity-70" />
                          {session.ip || 'Unknown IP'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 opacity-70" />
                          {session.isCurrent
                            ? 'Active now'
                            : `Last active ${formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLogoutSession(session.id)}
                      className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto mt-2 sm:mt-0"
                    >
                      <LogOut className="mr-2 h-4 w-4 sm:mr-0" />
                      <span className="sm:sr-only">Log out</span>
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {sortedSessions.length > 1 && (
          <div className="flex justify-end pt-4 mt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogoutOtherDevices}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out all other devices
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
