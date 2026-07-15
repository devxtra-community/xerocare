'use client';

import React, { useEffect, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllEmployees, Employee } from '@/lib/employee';
import { getMyBranch } from '@/lib/branch';
import { createTarget, TargetTier } from '@/lib/targets';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { formatCurrency } from '@/lib/format';
import { getUserFromToken } from '@/lib/auth';

import { getActiveCurrency } from '@/lib/currency';
interface AssignTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface TierRow extends TargetTier {
  rowId: string;
}

const ELIGIBLE_JOBS = [
  EmployeeJob.SALES,
  EmployeeJob.RENT_AND_LEASE,
  EmployeeJob.SERVICE_TECHNICIAN,
  EmployeeJob.SERVICE_HELP_DESK,
];

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function matchTier(tiers: TierRow[], achievementPercent: number): TierRow | undefined {
  return [...tiers]
    .sort((a, b) => a.fromPercent - b.fromPercent)
    .find(
      (t) =>
        achievementPercent >= t.fromPercent &&
        (t.toPercent === null || achievementPercent < t.toPercent),
    );
}

export default function AssignTargetDialog({
  open,
  onOpenChange,
  onSuccess,
}: AssignTargetDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [targetMonth, setTargetMonth] = useState(currentMonthStr());
  const [targetAmount, setTargetAmount] = useState('');
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [currencyCode, setCurrencyCode] = useState(getActiveCurrency());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const user = getUserFromToken();
    getAllEmployees(
      1,
      200,
      undefined,
      undefined,
      user?.role === 'MANAGER' ? user.branchId : undefined,
    )
      .then((res) => {
        const eligible = res.data.employees.filter((e) =>
          ELIGIBLE_JOBS.includes(e.employee_job as EmployeeJob),
        );
        setEmployees(eligible);
      })
      .catch(() => toast.error('Failed to load employees'));

    getMyBranch()
      .then((branch) => setCurrencyCode(branch.currency_code || getActiveCurrency()))
      .catch(() => setCurrencyCode(getActiveCurrency()));
  }, [open]);

  const addTier = () => {
    setTiers([
      ...tiers,
      {
        rowId: Math.random().toString(36).slice(2, 9),
        fromPercent: 0,
        toPercent: null,
        incentivePercent: 0,
      },
    ]);
  };

  const updateTier = (rowId: string, field: keyof TargetTier, value: string) => {
    setTiers(
      tiers.map((t) =>
        t.rowId === rowId
          ? { ...t, [field]: field === 'toPercent' && value === '' ? null : Number(value) }
          : t,
      ),
    );
  };

  const removeTier = (rowId: string) => {
    setTiers(tiers.filter((t) => t.rowId !== rowId));
  };

  const resetForm = () => {
    setEmployeeId('');
    setTargetMonth(currentMonthStr());
    setTargetAmount('');
    setTiers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return toast.error('Please select an employee');
    if (!targetAmount || Number(targetAmount) <= 0)
      return toast.error('Target amount must be greater than zero');
    if (tiers.length === 0) return toast.error('Add at least one incentive tier');

    try {
      setIsSubmitting(true);
      await createTarget({
        employeeId,
        targetMonth,
        targetAmount: Number(targetAmount),
        tiers: tiers.map(({ fromPercent, toPercent, incentivePercent }) => ({
          fromPercent,
          toPercent,
          incentivePercent,
        })),
      });
      toast.success('Target assigned successfully');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Failed to assign target');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewLevels = [50, 80, 100, 120];
  const amountNum = Number(targetAmount) || 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-[640px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Assign Sales Target</DialogTitle>
          <DialogDescription>
            Set a monthly revenue target and incentive tiers for an employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Employee
            </label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-none shadow-sm">
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-[300px]">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} —{' '}
                    {EMPLOYEE_JOB_LABELS[emp.employee_job as EmployeeJob] || emp.employee_job}
                  </SelectItem>
                ))}
                {employees.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    No eligible employees found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Target Month
              </label>
              <Input
                type="month"
                min={currentMonthStr()}
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="h-10 rounded-lg bg-muted/50 border-none shadow-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Target Amount ({currencyCode})
              </label>
              <Input
                type="number"
                min={0}
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="h-10 rounded-lg bg-muted/50 border-none shadow-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Incentive Tiers
              </label>
              <Button type="button" size="sm" variant="outline" onClick={addTier}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Tier
              </Button>
            </div>
            {tiers.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From %</TableHead>
                    <TableHead>To % (blank = no cap)</TableHead>
                    <TableHead>Incentive %</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier) => (
                    <TableRow key={tier.rowId}>
                      <TableCell>
                        <Input
                          type="number"
                          value={tier.fromPercent}
                          onChange={(e) => updateTier(tier.rowId, 'fromPercent', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={tier.toPercent ?? ''}
                          onChange={(e) => updateTier(tier.rowId, 'toPercent', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={tier.incentivePercent}
                          onChange={(e) =>
                            updateTier(tier.rowId, 'incentivePercent', e.target.value)
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeTier(tier.rowId)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {tiers.length > 0 && amountNum > 0 && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Example Payout Preview
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {previewLevels.map((level) => {
                  const achieved = (amountNum * level) / 100;
                  const tier = matchTier(tiers, level);
                  const incentive = achieved * ((tier?.incentivePercent ?? 0) / 100);
                  return (
                    <div
                      key={level}
                      className="rounded-lg bg-white dark:bg-slate-900 p-2 text-center border"
                    >
                      <div className="font-bold text-primary">{level}%</div>
                      <div className="text-muted-foreground">
                        {formatCurrency(incentive, currencyCode)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Target'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
