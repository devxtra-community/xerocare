'use client';

import React, { useState, useEffect } from 'react';
import HRPayrollStats from '@/components/HrComponents/HRPayrollStats';
import HRPayrollTable, { PayrollRecord } from '@/components/HrComponents/HRPayrollTable';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function PayrollPage() {
  const [data, setData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayroll();
  }, []);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const response = await api.get('/e/payroll/summary');
      const mappedData: PayrollRecord[] = response.data.map(
        (item: {
          id: string;
          name: string;
          email: string;
          role: string;
          branch_name: string;
          department: string;
          salary: string;
          leave_days: number;
          status: 'PAID' | 'PENDING';
          paid_date: string;
          payroll_id?: string;
        }) => ({
          id: item.id,
          name: item.name,
          email: item.email,
          role: item.role,
          branchName: item.branch_name,
          department: item.department,
          salaryPerMonth: `QAR ${parseFloat(item.salary).toLocaleString()}`,
          leaveDays: item.leave_days,
          status: item.status,
          paidDate: item.paid_date ? new Date(item.paid_date).toLocaleDateString() : '-',
          payrollId: item.payroll_id,
        }),
      );
      setData(mappedData);
    } catch (error) {
      console.error('Error fetching payroll:', error);
      toast.error('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Payroll Management</h1>
        <p className="text-muted-foreground">Manage employee salaries and payroll records</p>
      </div>

      {/* Stats Cards */}
      <HRPayrollStats data={data} loading={loading} />

      {/* Payroll Table */}
      <HRPayrollTable data={data} loading={loading} onUpdate={fetchPayroll} />
    </div>
  );
}
