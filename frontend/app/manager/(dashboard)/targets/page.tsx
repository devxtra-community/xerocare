'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, Search, TrendingUp, Trophy, Users } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getAllEmployees, Employee } from '@/lib/employee';
import { getUserFromToken, type JwtPayload } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { getActiveCurrency } from '@/lib/currency';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { FINANCE_JOB_LABELS, FinanceJob } from '@/lib/financeJob';
import {
  monthlyAchievement,
  getLeaderboard,
  getBranchMonthlyActivity,
  TargetWithAchievement,
  LeaderboardRow,
  EmployeeMonthlyActivity,
} from '@/lib/targets';
import { BranchSelector, ALL_BRANCHES } from '@/components/ui/BranchSelector';
import AssignTargetDialog from '@/components/ManagerDashboardComponents/targetComponents/AssignTargetDialog';

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const ZERO_ACTIVITY: Omit<EmployeeMonthlyActivity, 'employeeId'> = {
  salesCount: 0,
  salesRevenue: 0,
  rentCount: 0,
  rentRevenue: 0,
  leaseCount: 0,
  leaseRevenue: 0,
  totalRevenue: 0,
};

function employeeName(emp: Employee | undefined, fallback: string): string {
  if (!emp) return fallback;
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || fallback;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  FINANCE: 'Finance',
  EMPLOYEE: 'Employee',
};

// employee_job/finance_job only exist for EMPLOYEE/FINANCE-role people — HR,
// MANAGER, and ADMIN accounts have neither, so this needs to fall all the way
// back to the account role to avoid showing a blank Job column for them.
function jobLabel(emp: Employee): string {
  if (emp.employee_job)
    return EMPLOYEE_JOB_LABELS[emp.employee_job as EmployeeJob] || emp.employee_job;
  if (emp.finance_job) return FINANCE_JOB_LABELS[emp.finance_job as FinanceJob] || emp.finance_job;
  return ROLE_LABELS[emp.role] || emp.role;
}

export default function ManagerTargetsPage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthStr());
  const [branchId, setBranchId] = useState(ALL_BRANCHES);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'activity' | 'targets' | 'leaderboard'>('activity');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, Employee>>({});
  const [activity, setActivity] = useState<EmployeeMonthlyActivity[]>([]);
  const [rows, setRows] = useState<TargetWithAchievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
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
      const [targetRows, empRes, activityRows, leaderboardRows] = await Promise.all([
        monthlyAchievement(month, {
          branchId: effectiveBranchId,
          search: debouncedSearch || undefined,
        }),
        getAllEmployees(1, 200, undefined, debouncedSearch || undefined, effectiveBranchId),
        getBranchMonthlyActivity(month, { branchId: effectiveBranchId }),
        getLeaderboard(month, {
          branchId: effectiveBranchId,
          search: debouncedSearch || undefined,
        }),
      ]);

      setRows(targetRows);
      setActivity(activityRows);
      setLeaderboard(leaderboardRows);

      const map: Record<string, Employee> = {};
      empRes.data.employees.forEach((e) => {
        map[e.id] = e;
      });
      setEmployeeMap(map);
      setEmployees(empRes.data.employees);
    } catch {
      toast.error('Failed to load target/achievement data');
    } finally {
      setLoading(false);
    }
  }, [month, effectiveBranchId, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Every employee in the branch, even ones with zero activity and no target —
  // this is what makes the "All Employees" tab show reps a target was never
  // assigned to, unlike the achievement/leaderboard endpoints which only ever
  // know about employees who already have a target row.
  const activityRows = useMemo(() => {
    const byEmployee = new Map(activity.map((a) => [a.employeeId, a]));
    return employees
      .map((emp) => ({
        employee: emp,
        ...ZERO_ACTIVITY,
        ...(byEmployee.get(emp.id) || {}),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [employees, activity]);

  const totalIncentive = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.achievement.incentiveAmount), 0),
    [rows],
  );

  const columnCount = isAdmin ? 9 : 8;
  const currency = getActiveCurrency();

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => {
        const emp = employeeMap[r.target.employeeId];
        return {
          Name: employeeName(emp, r.target.employeeId),
          ...(isAdmin ? { Branch: r.branchName || '' } : {}),
          Job: emp ? jobLabel(emp) : '',
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
            <Button onClick={() => setAssignOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Assign Target
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="activity">
            <Users className="h-4 w-4 mr-1.5" /> All Employees
          </TabsTrigger>
          <TabsTrigger value="targets">
            <TrendingUp className="h-4 w-4 mr-1.5" /> Targets
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="h-4 w-4 mr-1.5" /> Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* ALL EMPLOYEES — every branch employee, sales/rent/lease done this
            month even if no target was ever assigned to them. */}
        <TabsContent value="activity" className="mt-4">
          <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="text-right">Lease</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : activityRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No employees found for this branch
                    </TableCell>
                  </TableRow>
                ) : (
                  activityRows.map((r) => (
                    <TableRow
                      key={r.employee.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/manager/employees/${r.employee.id}`)}
                    >
                      <TableCell className="font-medium">
                        {employeeName(r.employee, r.employee.id)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {jobLabel(r.employee)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{r.salesCount}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(r.salesRevenue, currency)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{r.rentCount}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(r.rentRevenue, currency)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{r.leaseCount}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(r.leaseRevenue, currency)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(r.totalRevenue, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TARGETS — employees who have a target assigned for this month. */}
        <TabsContent value="targets" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" onClick={exportExcel} disabled={rows.length === 0}>
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
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
                    <TableCell
                      colSpan={columnCount}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columnCount}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {debouncedSearch || branchId !== ALL_BRANCHES
                        ? `No targets match your filters for ${month}`
                        : `No targets assigned for ${month}`}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const emp = employeeMap[r.target.employeeId];
                    return (
                      <TableRow
                        key={r.target.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/manager/employees/${r.target.employeeId}`)}
                      >
                        <TableCell className="font-medium">
                          {employeeName(emp, r.target.employeeId)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-xs text-muted-foreground">
                            {r.branchName || '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-muted-foreground">
                          {emp ? jobLabel(emp) : r.target.targetType}
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
        </TabsContent>

        {/* LEADERBOARD — targeted employees ranked by achievement %. */}
        <TabsContent value="leaderboard" className="mt-4">
          <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  {isAdmin && <TableHead>Branch</TableHead>}
                  <TableHead>Job</TableHead>
                  <TableHead>Achieved</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Incentive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : leaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No targets assigned for {month} yet
                    </TableCell>
                  </TableRow>
                ) : (
                  leaderboard.map((r) => {
                    const emp = employeeMap[r.target.employeeId];
                    return (
                      <TableRow
                        key={r.target.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/manager/employees/${r.target.employeeId}`)}
                      >
                        <TableCell>
                          <span
                            className={`font-bold ${
                              r.rank === 1
                                ? 'text-amber-500'
                                : r.rank === 2
                                  ? 'text-slate-400'
                                  : r.rank === 3
                                    ? 'text-orange-700'
                                    : 'text-muted-foreground'
                            }`}
                          >
                            #{r.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {employeeName(emp, r.target.employeeId)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-xs text-muted-foreground">
                            {r.branchName || '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-muted-foreground">
                          {emp ? jobLabel(emp) : r.target.targetType}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(r.achievement.achievedAmount, r.target.currencyCode)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {Number(r.achievement.achievementPercent).toFixed(1)}%
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600">
                          {formatCurrency(r.achievement.incentiveAmount, r.target.currencyCode)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <AssignTargetDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onSuccess={loadData}
        branchId={effectiveBranchId}
      />
    </div>
  );
}
