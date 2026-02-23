'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, LogOut, CheckCircle2, Mail, Building2 } from 'lucide-react';
import Image from 'next/image';

import { Employee } from '@/lib/employee';

export interface AttendanceEmployee extends Employee {
  attendanceCount: number;
  leaveCount: number;
  lateCount: number;
  todayStatus: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: AttendanceEmployee | null;
}

/**
 * Dialog component displaying detailed attendance information for a specific employee.
 * Shows employee profile, role, branch, and a summary of attendance metrics (days present, leaves, late arrivals).
 */
export default function HRAttendanceDetailDialog({ open, onOpenChange, employee }: Props) {
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-card p-6 border-b border-slate-100">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-20 w-20 rounded-2xl bg-muted/50 border-2 border-slate-100 p-1 overflow-hidden flex-shrink-0">
                <div className="h-full w-full rounded-xl bg-card flex items-center justify-center relative overflow-hidden">
                  {employee.profile_image_url ? (
                    <Image
                      src={employee.profile_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                  ) : (
                    <span className="text-2xl font-black text-primary/20">
                      {(employee.first_name?.[0] || employee.email?.[0] || '?').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <DialogTitle className="text-2xl font-black flex items-center gap-2 text-foreground">
                  {employee.first_name} {employee.last_name}
                </DialogTitle>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-400">
                    <Mail className="h-3 w-3 text-primary/60" />
                    {employee.email || 'no-email@xerocare.com'}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-400">
                    <Building2 className="h-3 w-3 text-primary/60" />
                    {employee?.role || 'General Staff'}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Employee ID
              </span>
              <span className="text-sm font-mono font-black tracking-tight text-primary underline underline-offset-4 decoration-primary/20">
                {employee.display_id}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Role
              </span>
              <span className="text-sm font-black uppercase text-slate-700">{employee.role}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Branch
              </span>
              <span className="text-sm font-black text-slate-700">
                {employee.branch?.name || 'Main Branch'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-card">
          {/* Summary Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col">
              <div className="flex items-center gap-2 text-primary mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
              </div>
              <span className="text-2xl font-black text-primary">
                {employee.attendanceCount}{' '}
                <span className="text-xs font-bold opacity-60">Days</span>
              </span>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col">
              <div className="flex items-center gap-2 text-primary mb-1">
                <LogOut className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Leaves</span>
              </div>
              <span className="text-2xl font-black text-primary">
                {employee.leaveCount} <span className="text-xs font-bold opacity-60">Days</span>
              </span>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Late Arrivals
                </span>
              </div>
              <span className="text-2xl font-black text-primary">
                {employee.lateCount} <span className="text-xs font-bold opacity-60">Times</span>
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
