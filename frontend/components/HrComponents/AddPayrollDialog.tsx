'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PayrollRecord } from './HRPayrollTable';
import api from '@/lib/api';
import { toast } from 'sonner';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { FINANCE_JOB_LABELS, FinanceJob } from '@/lib/financeJob';
import { Filter, Sparkles } from 'lucide-react';
import { listTargetsByEmployee } from '@/lib/targets';
import { formatCurrency } from '@/lib/format';

interface AddPayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: PayrollRecord[];
  onSuccess: () => void;
}

/**
 * Dialog component for adding a new payroll record.
 * Allows HR to select an employee and enter salary details, status, and payment date.
 * Pre-fills employee information (Department, Role, Branch) upon selection.
 */
export default function AddPayrollDialog({
  open,
  onOpenChange,
  employees,
  onSuccess,
}: AddPayrollDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [formData, setFormData] = useState({
    salaryAmount: '',
    status: 'PENDING',
    paidDate: '',
    department: '',
    role: '',
    branchName: '',
  });
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incentiveBanner, setIncentiveBanner] = useState<{
    month: string;
    amount: number;
    currencyCode: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setIncentiveBanner(null);
      return;
    }
    listTargetsByEmployee(selectedEmployeeId)
      .then((rows) => {
        const finalized = rows
          .filter((r) => r.achievement.isFinalized)
          .sort((a, b) => (a.target.targetMonth < b.target.targetMonth ? 1 : -1));
        const latest = finalized[0];
        setIncentiveBanner(
          latest
            ? {
                month: latest.target.targetMonth,
                amount: Number(latest.achievement.incentiveAmount),
                currencyCode: latest.target.currencyCode,
              }
            : null,
        );
      })
      .catch(() => setIncentiveBanner(null));
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (selectedEmployeeId) {
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      if (emp) {
        setFormData((prev) => ({
          ...prev,
          salaryAmount: emp.salaryPerMonth.replace('QAR ', '').replace(/,/g, ''),
          department: emp.department,
          role: emp.role,
          branchName: emp.branchName,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        salaryAmount: '',
        department: '',
        role: '',
        branchName: '',
      }));
    }
  }, [selectedEmployeeId, employees]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/e/payroll', {
        employee_id: selectedEmployeeId,
        salary_amount: formData.salaryAmount,
        status: formData.status,
        paid_date: formData.paidDate || null,
      });
      toast.success('Payroll record added successfully');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      console.error('Error adding payroll:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add payroll record';
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDepartmentLabel = (dept: string) => {
    if (!dept) return 'N/A';
    if (dept === 'HR') return 'HR';
    if (dept === 'Management') return 'Management';
    if (dept === 'Administration') return 'Administration';
    return (
      EMPLOYEE_JOB_LABELS[dept as EmployeeJob] || FINANCE_JOB_LABELS[dept as FinanceJob] || dept
    );
  };

  const filteredEmployees = employees.filter((emp) => {
    if (departmentFilter === 'All') return true;
    return getDepartmentLabel(emp.department) === departmentFilter;
  });

  const allDepartments = Array.from(
    new Set(employees.map((emp) => getDepartmentLabel(emp.department))),
  ).sort();

  const resetForm = () => {
    setSelectedEmployeeId('');
    setIncentiveBanner(null);
    setFormData({
      salaryAmount: '',
      status: 'PENDING',
      paidDate: '',
      department: '',
      role: '',
      branchName: '',
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            Add New Salary Record
          </DialogTitle>
          <DialogDescription>Enter payroll details for an employee.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Filter by Department
            </label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-10 rounded-lg bg-card border-blue-400/60 focus:ring-blue-100 shadow-sm transition-all">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-400" />
                  <SelectValue placeholder="All Departments" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl w-48 max-h-[300px] overflow-y-auto">
                <SelectItem value="All">All Departments</SelectItem>
                {allDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Select User
            </label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-none shadow-sm capitalize">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {filteredEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} className="capitalize">
                    {emp.name} ({emp.email})
                  </SelectItem>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    No employees found in this department
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {incentiveBanner && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                Incentive for {incentiveBanner.month}:{' '}
                <strong>
                  {formatCurrency(incentiveBanner.amount, incentiveBanner.currencyCode)}
                </strong>{' '}
                — include in payroll
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Branch
              </label>
              <Input
                value={formData.branchName}
                readOnly
                className="h-10 rounded-lg bg-muted/30 border-none shadow-sm opacity-70 uppercase text-[10px] font-bold"
                placeholder="Branch"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Role
              </label>
              <Input
                value={formData.role}
                readOnly
                className="h-10 rounded-lg bg-muted/30 border-none shadow-sm opacity-70 uppercase text-[10px] font-bold"
                placeholder="Role"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Department
            </label>
            <Input
              value={formData.department}
              readOnly
              className="h-10 rounded-lg bg-muted/30 border-none shadow-sm opacity-70 uppercase text-[10px] font-bold"
              placeholder="Department"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Salary Amount (QAR)
            </label>
            <Input
              name="salaryAmount"
              type="number"
              value={formData.salaryAmount}
              onChange={handleChange}
              className="h-10 rounded-lg bg-muted/50 border-none shadow-sm"
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <Select value={formData.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-none shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Paid Date
              </label>
              <Input
                name="paidDate"
                type="date"
                value={formData.paidDate}
                onChange={handleChange}
                className="h-10 rounded-lg bg-muted/50 border-none shadow-sm pt-2"
                required={formData.status === 'PAID'}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary font-bold rounded-xl px-8"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Add Salary'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
