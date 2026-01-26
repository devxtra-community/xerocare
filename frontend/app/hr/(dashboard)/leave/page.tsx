'use client';

import HRLeaveStats from '@/components/HrComponents/HRLeaveStats';
import HRLeaveTable from '@/components/HrComponents/HRLeaveTable';

export default function HRLeavePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
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
