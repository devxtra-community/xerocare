'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Filter, Edit2, Loader2, Plus, History } from 'lucide-react';
import UpdatePayrollDialog from './UpdatePayrollDialog';
import AddPayrollDialog from './AddPayrollDialog';
import HRPayrollHistoryDialog from './HRPayrollHistoryDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { FINANCE_JOB_LABELS, FinanceJob } from '@/lib/financeJob';

// Mock data type updated to match real data or mapping
export type PayrollRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  branchName: string;
  department: string;
  salaryPerMonth: string;
  leaveDays: number;
  status: 'PAID' | 'PENDING';
  paidDate: string;
  payrollId?: string;
};

/*
 ### Bug Fixes (Persistence & Logic)

- **Resolved 404 Not Found**: Fixed an ID mismatch where the employee ID was being used instead of the payroll UUID for updates. The backend now returns `payroll_id`, which the frontend uses for `PUT` requests.
- **Resolved 400 Bad Request**: Implemented a "smart update" mechanism. The frontend now automatically detects if a payroll record exists for the month; if not, it uses `POST` to create it, otherwise it uses `PUT` to update the existing one. This prevents duplicate record errors.
- **Improved Data Integrity**: The "Add Salary" and "Update Payroll" flows now properly synchronize with the database, ensuring that HR changes are persistent and correctly trigger employee notifications.

## Verification Results

### Backend
- All routes are registered and lint errors fixed.
- `Notification` entity is properly synchronized.
- `payroll_id` successfully included in summary response.

### Frontend
- Notification bell correctly displays the unread count.
- Notifications are fetched and displayed in the dropdown.
- Clicking a salary notification opens the `SalaryDetailsDialog`.
- Payroll updates now persist correctly without 404/400 errors.
- "Mark all as read" functionality works as expected.
*/

/**
 * Main Payroll Management Table.
 * Features:
 * - List of all employee payroll records.
 * - Filtering by Role and Status (Paid/Pending).
 * - Searching by name, email, or department.
 * - Integration with Add and Update Payroll dialogs.
 * - Smart handling of payroll record creation vs update.
 */
/**
 * Payroll Management Table.
 * Displays employee payroll records with salary details and payment status.
 * Allows HR to add new payroll entries or update existing ones, with search and filter support.
 */
export default function HRPayrollTable({
  data,
  loading,
  onUpdate,
}: {
  data: PayrollRecord[];
  loading: boolean;
  onUpdate: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const handleEditClick = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsUpdateOpen(true);
  };

  const handleAddClick = () => {
    setIsAddOpen(true);
  };

  const handleHistoryClick = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsHistoryOpen(true);
  };

  const handleUpdateSubmit = async (id: string, updatedData: Partial<PayrollRecord>) => {
    try {
      const payload = {
        employee_id: id,
        salary_amount: updatedData.salaryPerMonth?.replace('QAR ', '').replace(/,/g, ''),
        status: updatedData.status,
        paid_date: updatedData.paidDate || null,
        leave_days: updatedData.leaveDays,
      };

      if (updatedData.payrollId) {
        await api.put(`/e/payroll/${updatedData.payrollId}`, payload);
      } else {
        await api.post('/e/payroll', payload);
      }

      toast.success('Payroll record updated successfully');
      onUpdate();
    } catch (error: unknown) {
      console.error('Error updating payroll:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update payroll record';
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || errorMessage);
    }
  };

  const filteredData = data.filter((record) => {
    const getDepartmentLabel = (dept: string) => {
      if (!dept) return 'N/A';
      if (dept === 'HR') return 'HR';
      if (dept === 'Management') return 'Management';
      if (dept === 'Administration') return 'Administration';
      return (
        EMPLOYEE_JOB_LABELS[dept as EmployeeJob] || FINANCE_JOB_LABELS[dept as FinanceJob] || dept
      );
    };

    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDepartmentLabel(record.department).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
    const matchesRole = roleFilter === 'All' || record.role === roleFilter;
    const matchesDepartment =
      !departmentFilter || getDepartmentLabel(record.department) === departmentFilter;
    return matchesSearch && matchesStatus && matchesRole && matchesDepartment;
  });

  const allDepartments = Array.from(
    new Set(
      data.map((record) => {
        if (!record.department) return 'N/A';
        if (record.department === 'HR') return 'HR';
        if (record.department === 'Management') return 'Management';
        if (record.department === 'Administration') return 'Administration';
        return (
          EMPLOYEE_JOB_LABELS[record.department as EmployeeJob] ||
          FINANCE_JOB_LABELS[record.department as FinanceJob] ||
          record.department
        );
      }),
    ),
  ).sort();

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, department or email..."
              className="pl-10 h-10 bg-card border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm rounded-xl transition-all w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[150px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-10 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl justify-between px-3"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="h-4 w-4" />
                    <span className="truncate">Role: {roleFilter}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 rounded-xl p-1 bg-white border-slate-200 shadow-xl"
              >
                <DropdownMenuItem
                  onClick={() => setRoleFilter('All')}
                  className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                >
                  All Roles
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRoleFilter('EMPLOYEE')}
                  className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                >
                  Employee
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRoleFilter('FINANCE')}
                  className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                >
                  Finance
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRoleFilter('MANAGER')}
                  className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                >
                  Manager
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRoleFilter('HR')}
                  className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                >
                  HR
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="w-full sm:w-[150px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-10 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl justify-between px-3"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="h-4 w-4" />
                    <span className="truncate">Status: {statusFilter}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 rounded-xl p-1 bg-white border-slate-200 shadow-xl"
              >
                <DropdownMenuItem
                  onClick={() => setStatusFilter('All')}
                  className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                >
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter('PAID')}
                  className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                >
                  Paid
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter('PENDING')}
                  className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                >
                  Pending
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="w-full sm:w-[150px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-10 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl justify-between px-3"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="h-4 w-4" />
                    <span className="truncate">Dept: {departmentFilter}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl p-1 bg-white border-slate-200 shadow-xl max-h-[300px] overflow-y-auto"
              >
                {allDepartments.map((dept) => (
                  <DropdownMenuItem
                    key={dept}
                    onClick={() => setDepartmentFilter(dept)}
                    className="rounded-lg focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2"
                  >
                    {dept}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleAddClick}
            className="h-10 bg-primary hover:bg-primary/90 rounded-xl flex-1 sm:flex-none font-bold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Salary
          </Button>
          <Button
            variant="outline"
            className="h-10 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Payroll
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-auto max-h-[500px] relative">
          <Table className="w-full text-left">
            <TableHeader className="bg-muted/50/50 sticky top-0 z-20 shadow-sm">
              <TableRow className="border-b border-gray-100 hover:bg-transparent">
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Employee Name
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Email
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Role
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Department
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-right">
                  Salary / Month
                </TableHead>
                <TableHead className="px-1.5 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Leave
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Status
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Paid Date
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-3 py-20 text-center text-muted-foreground text-sm italic"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                      <p>Fetching payroll records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-3 py-20 text-center text-muted-foreground text-sm italic"
                  >
                    No payroll records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((record, index) => (
                  <TableRow
                    key={record.id}
                    className={`transition-colors h-11 border-b border-gray-50 hover:bg-primary/5 ${
                      index % 2 === 0 ? 'bg-card' : 'bg-blue-50/20'
                    }`}
                  >
                    <TableCell className="px-3 py-1.5 whitespace-nowrap font-medium text-primary capitalize">
                      {record.name}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {record.email}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 uppercase">
                        {record.role}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap uppercase text-[10px] font-bold text-primary">
                      {(() => {
                        if (!record.department) return 'N/A';
                        if (record.department === 'HR') return 'HR';
                        if (record.department === 'Management') return 'Management';
                        if (record.department === 'Administration') return 'Administration';
                        return (
                          EMPLOYEE_JOB_LABELS[record.department as EmployeeJob] ||
                          FINANCE_JOB_LABELS[record.department as FinanceJob] ||
                          record.department
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 font-medium whitespace-nowrap text-right text-primary">
                      {record.salaryPerMonth}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap text-center">
                      {record.leaveDays}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                        ${
                          record.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${record.status === 'PAID' ? 'bg-green-600' : 'bg-amber-600'}`}
                        />
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {record.paidDate}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-right flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-slate-50"
                        onClick={() => handleHistoryClick(record)}
                        title="View Payment History"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleEditClick(record)}
                        title="Update Current Month"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UpdatePayrollDialog
        open={isUpdateOpen}
        onOpenChange={setIsUpdateOpen}
        record={selectedRecord}
        onSubmit={handleUpdateSubmit}
      />

      <AddPayrollDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        employees={data}
        onSuccess={onUpdate}
      />

      <HRPayrollHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        employeeId={selectedRecord?.id || null}
        employeeName={selectedRecord?.name || null}
      />
    </div>
  );
}
