'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getSessions, logoutSession, logoutOtherDevices } from '@/lib/auth';
import { Laptop, Smartphone, Globe, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
    if (!userAgent) return <Globe className="h-4 w-4" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (
      ua.includes('electron') ||
      ua.includes('windows') ||
      ua.includes('mac') ||
      ua.includes('linux')
    ) {
      return <Laptop className="h-4 w-4" />;
    }
    return <Globe className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Session Information</span>
            {sessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogoutOtherDevices}
                className="text-destructive hover:text-destructive"
              >
                Logout all other devices
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="pt-4 overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device / Browser</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading session info...
                  </TableCell>
                </TableRow>
              ) : (
                sessions
                  .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1))
                  .map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-full">
                          {getDeviceIcon(session.userAgent)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[250px]">
                            {session.userAgent || 'Unknown Device'}
                          </span>
                          {session.isCurrent && (
                            <span className="text-[10px] text-green-600 font-semibold px-1.5 py-0.5 bg-green-50 rounded-full w-fit">
                              Current Device
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {session.ip || 'Unknown IP'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        {!session.isCurrent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleLogoutSession(session.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
