'use client';

import HRLeaveStats from '@/components/HrComponents/HRLeaveStats';
import HRLeaveTable from '@/components/HrComponents/HRLeaveTable';

export default function HRLeavePage() {
  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Leave Management</h1>
        <p className="text-muted-foreground">
          Manage employee leaves, holidays and view monthly statistics.
        </p>
      </div>

      <HRLeaveStats />
      <HRLeaveTable />
    </div>
  );
}
