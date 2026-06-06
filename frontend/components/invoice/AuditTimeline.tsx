'use client';

import React, { useEffect, useState } from 'react';
import { getAuditLogs, AuditLog } from '@/lib/invoice';
import { getUserFromToken } from '@/lib/auth';
import {
  CheckCircle2,
  XCircle,
  Cpu,
  Coins,
  PlusCircle,
  Mail,
  Activity,
  User,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface AuditTimelineProps {
  entityId: string;
}

export default function AuditTimeline({ entityId }: AuditTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const currentUser = getUserFromToken();
  const canView = currentUser && ['MANAGER', 'FINANCE', 'ADMIN'].includes(currentUser.role);

  useEffect(() => {
    if (!canView || !entityId) {
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAuditLogs(entityId);
        // Sort newest first
        const sorted = (data || []).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setLogs(sorted);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        setError('Failed to load activity logs.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [entityId, canView]);

  if (!canView) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="animate-spin h-6 w-6 text-primary mb-2" />
        <span className="text-xs font-semibold">Loading activity logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-800 text-xs">
        <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Access Limited</p>
          <p className="opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border border-dashed border-gray-100 rounded-xl">
        <Activity className="h-8 w-8 mx-auto opacity-30 mb-2" />
        <p className="text-xs font-semibold">No activity logs recorded yet.</p>
      </div>
    );
  }

  const getEventStyle = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('REJECT') || act.includes('CANCEL')) {
      return {
        icon: XCircle,
        color: 'text-rose-600 bg-rose-50 border-rose-200',
        badge: 'bg-rose-50 text-rose-700 border-rose-100',
      };
    }
    if (act.includes('APPROVE') || act.includes('ACTIVATE') || act.includes('ACCEPT')) {
      return {
        icon: CheckCircle2,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      };
    }
    if (act.includes('ALLOCAT')) {
      return {
        icon: Cpu,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      };
    }
    if (act.includes('PAY') || act.includes('COLLECT')) {
      return {
        icon: Coins,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        badge: 'bg-amber-50 text-amber-700 border-amber-100',
      };
    }
    if (act.includes('CREATE') || act.includes('NEW') || act.includes('CONVERT')) {
      return {
        icon: PlusCircle,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        badge: 'bg-blue-50 text-blue-700 border-blue-100',
      };
    }
    if (act.includes('NOTIF') || act.includes('SEND') || act.includes('EMAIL')) {
      return {
        icon: Mail,
        color: 'text-sky-600 bg-sky-50 border-sky-200',
        badge: 'bg-sky-50 text-sky-700 border-sky-100',
      };
    }
    return {
      icon: Activity,
      color: 'text-slate-600 bg-slate-50 border-slate-200',
      badge: 'bg-slate-50 text-slate-700 border-slate-100',
    };
  };

  const renderJsonDiff = (oldVal?: string, newVal?: string) => {
    if (!oldVal && !newVal) return null;

    let oldParsed: Record<string, unknown> | null = null;
    let newParsed: Record<string, unknown> | null = null;

    try {
      if (oldVal) oldParsed = JSON.parse(oldVal);
    } catch {
      oldParsed = { value: oldVal };
    }

    try {
      if (newVal) newParsed = JSON.parse(newVal);
    } catch {
      newParsed = { value: newVal };
    }

    const allKeys = Array.from(
      new Set([...Object.keys(oldParsed || {}), ...Object.keys(newParsed || {})]),
    );

    return (
      <div className="mt-3 p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-slate-300 space-y-1.5 border border-slate-800 shadow-inner overflow-x-auto">
        <p className="text-slate-500 font-bold mb-1 border-b border-slate-800 pb-1">
          Value Comparison:
        </p>
        {allKeys.map((key) => {
          const oVal = oldParsed?.[key];
          const nVal = newParsed?.[key];

          if (oVal === nVal) return null;

          const formatVal = (v: unknown): string => {
            if (v === null || v === undefined) return 'null';
            if (typeof v === 'object') return JSON.stringify(v);
            return String(v);
          };

          return (
            <div
              key={key}
              className="grid grid-cols-1 gap-1 py-1 border-b border-slate-800/50 last:border-0"
            >
              <span className="text-sky-400 font-semibold">{key}:</span>
              <div className="pl-2 space-y-0.5">
                {oVal !== undefined && (
                  <p className="text-rose-400 line-through">- {formatVal(oVal)}</p>
                )}
                {nVal !== undefined && <p className="text-emerald-400">+ {formatVal(nVal)}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <Activity className="h-4 w-4 text-gray-500" />
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Activity History Logs
        </h3>
        <Badge variant="secondary" className="ml-auto text-[10px] font-bold">
          {logs.length} Events
        </Badge>
      </div>

      <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
          {logs.map((log) => {
            const style = getEventStyle(log.action);
            const IconComponent = style.icon;
            const isExpanded = expandedLogId === log.id;
            const hasDiff = !!(log.oldValue || log.newValue);

            return (
              <div key={log.id} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 top-0 p-1.5 rounded-full border shadow-sm transition-all group-hover:scale-110 ${style.color}`}
                >
                  <IconComponent className="h-3.5 w-3.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-extrabold text-gray-800 leading-none">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="outline" className={`text-[9px] font-bold py-0 ${style.badge}`}>
                      {log.action}
                    </Badge>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-auto font-medium">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    {log.details || log.action}
                  </p>

                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-1">
                    <User className="h-3 w-3" />
                    <span>By: {log.performedBy}</span>

                    {hasDiff && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="ml-auto flex items-center gap-0.5 text-primary hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide Details</span>
                            <ChevronUp className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            <span>Compare Values</span>
                            <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {isExpanded && renderJsonDiff(log.oldValue, log.newValue)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
