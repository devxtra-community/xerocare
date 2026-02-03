'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import EmployeeLeaveApplicationDialog from '@/components/employeeComponents/EmployeeLeaveApplicationDialog';
import EmployeeLeaveApplicationsTable from '@/components/employeeComponents/EmployeeLeaveApplicationsTable';

export default function EmployeeLeavePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">My Leave Applications</h1>
          <p className="text-muted-foreground mt-1">View and manage your leave applications</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 font-bold">
          <Plus className="h-4 w-4" />
          Apply for Leave
        </Button>
      </div>

      <EmployeeLeaveApplicationsTable key={refreshKey} />

      <EmployeeLeaveApplicationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
