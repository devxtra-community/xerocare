'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, Search, TrendingUp } from 'lucide-react';
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
import { getUserFromToken, type JwtPayload } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { monthlyAchievement, TargetWithAchievement } from '@/lib/targets';
import { BranchSelector, ALL_BRANCHES } from '@/components/ui/BranchSelector';
import AssignTargetDialog from '@/components/ManagerDashboardComponents/targetComponents/AssignTargetDialog';

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ManagerTargetsPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const [branchId, setBranchId] = useState(ALL_BRANCHES);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rows, setRows] = useState<TargetWithAchievement[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // getUserFromToken() reads localStorage, which doesn't exist during SSR — reading
  // it directly during render would make the server and client markup diverge
  // (no branch filter/column on the server, present on the client) and trigger a
  // hydration error. Resolving it in an effect keeps the first client render
  // identical to the server render; the role-aware UI appears right after mount.
  const [user, setUser] = useState<JwtPayload | null>(null);
  useEffect(() => {
    setUser(getUserFromToken());
  }, []);

  const isAdmin = user?.role === 'ADMIN';

  // MANAGER is always locked to their own branch; ADMIN uses the filter below
  // (undefined = all branches). This is what actually gets sent to the API.
  const effectiveBranchId =
    user?.role === 'MANAGER' ? user.branchId : branchId === ALL_BRANCHES ? undefined : branchId;

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await monthlyAchievement(month, {
        branchId: effectiveBranchId,
        search: debouncedSearch || undefined,
      });
      setRows(data);

      const empRes = await getAllEmployees(
        1,
        200,
        undefined,
        debouncedSearch || undefined,
        effectiveBranchId,
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
  }, [month, effectiveBranchId, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalIncentive = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.achievement.incentiveAmount), 0),
    [rows],
  );

  const columnCount = isAdmin ? 9 : 8;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => {
        const emp = employeeMap[r.target.employeeId];
        return {
          Name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : r.target.employeeId,
          ...(isAdmin ? { Branch: r.branchName || '' } : {}),
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
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Branch Achievement Dashboard
          </h1>
          <p className="text-sm text-gray-500">Monthly targets and incentive tracking</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <BranchSelector value={branchId} onValueChange={setBranchId} className="h-9" />
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48 pl-8"
              />
            </div>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 w-36"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={exportExcel} disabled={rows.length === 0}>
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
            <Button onClick={() => setAssignOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Assign Target
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              {isAdmin && <TableHead>Branch</TableHead>}
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
                <TableCell colSpan={columnCount} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-8 text-muted-foreground">
                  {debouncedSearch || branchId !== ALL_BRANCHES
                    ? `No targets match your filters for ${month}`
                    : `No targets assigned for ${month}`}
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
                    {isAdmin && (
                      <TableCell className="text-xs text-muted-foreground">
                        {r.branchName || '—'}
                      </TableCell>
                    )}
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
            {formatCurrency(totalIncentive, rows[0]?.target.currencyCode)}
          </span>
        </div>
      )}

      <AssignTargetDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onSuccess={loadData}
        branchId={effectiveBranchId}
      />
    </div>
  );
}
