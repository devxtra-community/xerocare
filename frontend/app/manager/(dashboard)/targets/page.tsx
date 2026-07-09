'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllEmployees, Employee } from '@/lib/employee';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { monthlyAchievement, TargetWithAchievement } from '@/lib/targets';
import AssignTargetDialog from '@/components/ManagerDashboardComponents/targetComponents/AssignTargetDialog';

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ManagerTargetsPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const [rows, setRows] = useState<TargetWithAchievement[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await monthlyAchievement(month);
      setRows(data);

      const user = getUserFromToken();
      const empRes = await getAllEmployees(
        1,
        200,
        undefined,
        undefined,
        user?.role === 'MANAGER' ? user.branchId : undefined,
      );
      const map: Record<string, Employee> = {};
      empRes.data.employees.forEach((e) => {
        map[e.id] = e;
      });
      setEmployeeMap(map);
    } catch {
      toast.error('Failed to load achievement data');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalIncentive = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.achievement.incentiveAmount), 0),
    [rows],
  );

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => {
        const emp = employeeMap[r.target.employeeId];
        return {
          Name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : r.target.employeeId,
          Job: emp?.employee_job ? EMPLOYEE_JOB_LABELS[emp.employee_job as EmployeeJob] : '',
          Target: r.target.targetAmount,
          Achieved: r.achievement.achievedAmount,
          'Achievement %': r.achievement.achievementPercent,
          'Tier %': r.achievement.appliedTierPercent,
          Incentive: r.achievement.incentiveAmount,
          Finalized: r.achievement.isFinalized ? 'Yes' : 'No',
        };
      }),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Targets');
    XLSX.writeFile(wb, `Branch_Targets_${month}.xlsx`);
  };

  return (
    <div className="min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Branch Achievement Dashboard
          </h1>
          <p className="text-sm text-gray-500">Monthly targets and incentive tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" onClick={exportExcel} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button onClick={() => setAssignOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Assign Target
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Achieved</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Current Tier</TableHead>
              <TableHead>Incentive</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No targets assigned for {month}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const emp = employeeMap[r.target.employeeId];
                return (
                  <TableRow key={r.target.id}>
                    <TableCell className="font-medium">
                      {emp
                        ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
                        : r.target.employeeId}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {emp?.employee_job
                        ? EMPLOYEE_JOB_LABELS[emp.employee_job as EmployeeJob]
                        : r.target.targetType}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(r.target.targetAmount, r.target.currencyCode)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(r.achievement.achievedAmount, r.target.currencyCode)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {Number(r.achievement.achievementPercent).toFixed(1)}%
                    </TableCell>
                    <TableCell>{Number(r.achievement.appliedTierPercent)}%</TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      {formatCurrency(r.achievement.incentiveAmount, r.target.currencyCode)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.achievement.isFinalized
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.achievement.isFinalized ? 'Finalized' : 'Live'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total incentive for {month}:{' '}
          <span className="font-semibold text-emerald-600">
            {formatCurrency(totalIncentive, rows[0]?.target.currencyCode || 'AED')}
          </span>
        </div>
      )}

      <AssignTargetDialog open={assignOpen} onOpenChange={setAssignOpen} onSuccess={loadData} />
    </div>
  );
}
