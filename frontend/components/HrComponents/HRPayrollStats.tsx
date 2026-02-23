import StatCard from '@/components/StatCard';
import { PayrollRecord } from './HRPayrollTable';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

/**
 * Component displaying key payroll statistics.
 * Shows total employee count, total monthly payroll cost, unique departments, and overall status.
 * implementation utilizes StatCard components for visualization.
 */
export default function HRPayrollStats({
  data,
  loading,
}: {
  data: PayrollRecord[];
  loading: boolean;
}) {
  // Calculate real stats from the payroll data
  const employeeCount = data.length;

  const totalPayrollValue = data.reduce((sum, item) => {
    // Remove currency symbol and commas before parsing
    const value = parseFloat(item.salaryPerMonth.replace('QAR ', '').replace(/,/g, '')) || 0;
    return sum + value;
  }, 0);

  const payrollPerMonth = formatCurrency(totalPayrollValue);

  const uniqueDepartments = new Set(data.map((item) => item.department)).size;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-card rounded-xl border border-gray-100 flex items-center justify-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary/20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Employee Count"
        value={employeeCount.toString()}
        subtitle="Total employees"
      />
      <StatCard title="Payroll / Month" value={payrollPerMonth} subtitle="Total monthly payroll" />
      <StatCard
        title="Departments"
        value={uniqueDepartments.toString()}
        subtitle="Active departments"
      />
      <StatCard title="Status" value="Active" subtitle="Current payroll status" />
    </div>
  );
}
