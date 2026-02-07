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
import { Card } from '@/components/ui/card';

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
    if (!userAgent) return <Globe className="h-5 w-5 text-muted-foreground" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-5 w-5 text-blue-500" />;
    }
    if (
      ua.includes('electron') ||
      ua.includes('windows') ||
      ua.includes('mac') ||
      ua.includes('linux') ||
      ua.includes('ubuntu')
    ) {
      return <Laptop className="h-5 w-5 text-purple-500" />;
    }
    return <Globe className="h-5 w-5 text-muted-foreground" />;
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
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-muted/50/50">
        <DialogHeader className="p-6 pb-2 bg-card border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                Active Sessions
              </DialogTitle>
              <DialogDescription>
                Manage devices where your account is currently logged in.
              </DialogDescription>
            </div>
            <ShieldCheck className="h-8 w-8 text-green-500 opacity-20" />
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading active sessions...
              </div>
            ) : sortedSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active sessions found.
              </div>
            ) : (
              sortedSessions.map((session) => (
                <Card
                  key={session.id}
                  className={`p-4 flex items-center justify-between transition-all hover:shadow-md ${
                    session.isCurrent
                      ? 'border-blue-200 bg-blue-50/30 ring-1 ring-blue-100'
                      : 'bg-card'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-full mt-1 ${session.isCurrent ? 'bg-blue-100' : 'bg-slate-100'}`}
                    >
                      {getDeviceIcon(session.userAgent)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {getDeviceName(session.userAgent)}
                        </span>
                        {session.isCurrent && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] h-5"
                          >
                            Current Device
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col text-xs text-muted-foreground gap-1">
                        <span className="flex items-center gap-1.5">
                          <Globe className="h-3 w-3" />
                          {session.ip || 'Unknown IP'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
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
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 ml-2"
                      title="Log out this device"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {sortedSessions.length > 1 && (
          <div className="p-4 bg-card border-t flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogoutOtherDevices}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Log out all other devices
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
