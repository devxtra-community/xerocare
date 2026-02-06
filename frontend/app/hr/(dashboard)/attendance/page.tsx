'use client';

import React from 'react';
import HRAttendanceStats from '@/components/HrComponents/HRAttendanceStats';
import HRAttendanceTable from '@/components/HrComponents/HRAttendanceTable';
import HRAttendanceGraph from '@/components/HrComponents/HRAttendanceGraph';
import HRLeaveGraph from '@/components/HrComponents/HRLeaveGraph';

export default function HRAttendancePage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 bg-blue-50/50 min-h-screen font-sans">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-primary">Attendance Management</h2>
        <p className="text-sm text-muted-foreground font-medium">
          Monitor daily attendance, track leaves, and manage punctuality records.
        </p>
      </div>

      {/* Stats Cards */}
      <HRAttendanceStats />

      {/* Attendance & Leave Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-primary uppercase tracking-widest px-2">
            Daily Attendance
          </h4>
          <HRAttendanceGraph />
        </div>
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-primary uppercase tracking-widest px-2">
            Daily Leaves
          </h4>
          <HRLeaveGraph />
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-blue-100/50">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-primary">Daily Attendance Log</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            Real-time status and cumulative metrics for all staff
          </p>
        </div>
        <HRAttendanceTable />
      </div>
    </div>
  );
}
