'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Calendar, Building, Layers, FilterX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
} from 'recharts';
import { getFinanceReport, FinanceReportItem } from '@/lib/invoice';
import { getBranches, Branch } from '@/lib/branch';
import { formatCurrency, formatCompactNumber } from '@/lib/format';
import { YearSelector } from '@/components/ui/YearSelector';

type Finance = {
  id: string;
  month: string;
  income: number;
  expense: number;
  source: 'Sale' | 'Lease' | 'Rent' | 'All';
  profit: number;
  profitStatus: 'profit' | 'loss';
  branchId: string;
  branchName?: string;
  count: number;
  salaryExpense?: number;
  purchaseExpense?: number;
};

/**
 * Main Finance Report Page.
 * Aggregates financial data (income, expense, profit) from all branches.
 * Features comprehensive filtering by month, branch, and source (Sale/Lease/Rent).
 * Visualizes data using interactive charts and summary cards.
 */
export default function FinanceReport() {
  const [finance, setFinance] = useState<Finance[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'SALE' | 'LEASE' | 'RENT'>('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const monthsList = [
    { name: 'January', value: 1 },
    { name: 'February', value: 2 },
    { name: 'March', value: 3 },
    { name: 'April', value: 4 },
    { name: 'May', value: 5 },
    { name: 'June', value: 6 },
    { name: 'July', value: 7 },
    { name: 'August', value: 8 },
    { name: 'September', value: 9 },
    { name: 'October', value: 10 },
    { name: 'November', value: 11 },
    { name: 'December', value: 12 },
  ];

  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const branchesData = await getBranches();
        setBranches(branchesData.data || []);
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    loadStaticData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getFinanceReport({
          branchId: branchFilter,
          saleType: sourceFilter,
          month: monthFilter === 'All' ? undefined : parseInt(monthFilter, 10),
          year: selectedYear === 'all' ? undefined : selectedYear,
        });

        // Enrich data with branch names
        const enrichedData = data.map((item: FinanceReportItem, idx: number) => {
          const branch = branches.find((b) => b.id === item.branchId);
          return {
            ...item,
            id: `${item.month}-${item.branchId}-${item.source}-${idx}`,
            branchName:
              !item.branchId || item.branchId === 'All'
                ? 'All Branches'
                : branch
                  ? branch.name
                  : 'Unknown Branch',
          } as Finance;
        });

        setFinance(enrichedData);
      } catch (err) {
        console.error('Failed to fetch finance report', err);
      } finally {
        setLoading(false);
      }
    };

    if (branches.length > 0 || branchFilter === 'All') {
      fetchData();
    }
  }, [branchFilter, sourceFilter, monthFilter, branches, selectedYear]);

  // 🔍 Search filter (on already fetched/filtered data)
  const filteredFinance = finance.filter((f) => {
    const matchesSearch = `${f.month} ${f.source} ${f.branchName || ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch;
  });

  // 📊 Stats
  const totalIncome = filteredFinance.reduce((s: number, f: Finance) => s + f.income, 0);
  const totalExpense = filteredFinance.reduce((s: number, f: Finance) => s + f.expense, 0);
  const totalSalaryExpense = filteredFinance.reduce(
    (s: number, f: Finance) => s + (f.salaryExpense || 0),
    0,
  );
  const netProfit = totalIncome - totalExpense;

  // Calculate dynamic chart data from filteredFinance
  const chartMonthsShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const dynamicChartData = chartMonthsShort
    .map((m, idx) => {
      const monthNum = (idx + 1).toString().padStart(2, '0');
      const monthData = filteredFinance.filter((f) => f.month.endsWith(`-${monthNum}`));
      const income = monthData.reduce((s: number, f: Finance) => s + f.income, 0);
      const purchaseExpense = monthData.reduce(
        (s: number, f: Finance) => s + (f.purchaseExpense || 0),
        0,
      );
      const salaryExpense = monthData.reduce(
        (s: number, f: Finance) => s + (f.salaryExpense || 0),
        0,
      );
      // Re-calculate total expense or use aggregated
      // Actually f.expense already has purchase + salary from backend.
      // Let's use the field from the data.
      const totalExpense = monthData.reduce((s: number, f: Finance) => s + f.expense, 0);
      const profit = income - totalExpense;
      const margin = income > 0 ? parseFloat(((profit / income) * 100).toFixed(1)) : 0;
      return {
        month: m,
        income,
        expense: totalExpense,
        purchaseExpense,
        salaryExpense,
        profit,
        margin,
      };
    })
    .filter((d) => d.income > 0 || d.expense > 0);

  return (
    <div className="bg-blue-100 min-h-screen p-4 space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Financial Report</h3>
        <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Income"
          value={formatCurrency(totalIncome)}
          subtitle={`${branchFilter === 'All' ? 'All branches' : branches.find((b) => b.id === branchFilter)?.name || 'Branch'} | ${selectedYear === 'all' ? 'All Years' : selectedYear}`}
        />
        <StatCard
          title="Total Expense"
          value={formatCurrency(totalExpense)}
          subtitle={`${branchFilter === 'All' ? 'All branches' : branches.find((b) => b.id === branchFilter)?.name || 'Branch'} | ${selectedYear === 'all' ? 'All Years' : selectedYear}`}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(netProfit)}
          subtitle={`Profit in ${selectedYear === 'all' ? 'All Years' : selectedYear}`}
        />
        <StatCard
          title="Payroll Expense"
          value={formatCurrency(totalSalaryExpense)}
          subtitle={`Salaries in ${selectedYear === 'all' ? 'All Years' : selectedYear}`}
        />
      </div>

      {/* Monthly Performance Charts */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Income vs Expense Chart */}
        <div className="flex-1 bg-card rounded-2xl shadow-sm border border-blue-100 p-4 h-full min-h-[400px]">
          <h4 className="text-sm font-bold text-primary uppercase mb-6">Income vs Expenses</h4>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dynamicChartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(v) => `${formatCompactNumber(v)}`}
                />
                <Tooltip
                  formatter={(val: number) => [`QAR ${formatCompactNumber(val)}`]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  barSize={20}
                  fill="#1d4ed8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="purchaseExpense"
                  name="Purchase Expense"
                  barSize={20}
                  fill="#93c5fd"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="salaryExpense"
                  name="Salary Expense"
                  barSize={20}
                  fill="#60a5fa"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Trend"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Trend Chart */}
        <div className="flex-1 bg-card rounded-2xl shadow-sm border border-blue-100 p-4 h-full min-h-[400px]">
          <h4 className="text-sm font-bold text-primary uppercase mb-6">Profit Trend</h4>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dynamicChartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(val) => `${formatCompactNumber(val)}`}
                />
                <Tooltip
                  formatter={(val: number) => [`QAR ${formatCompactNumber(val)}`, 'Net Profit']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#1d4ed8' }}
                />
                <Bar
                  dataKey="profit"
                  name="Net Profit"
                  fill="#1d4ed8"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Search Report
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search report..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Month
            </label>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="All Months" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Months</SelectItem>
                {monthsList.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Branch
            </label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="All Branches" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Source
            </label>
            <Select
              value={sourceFilter}
              onValueChange={(val) => setSourceFilter(val as 'All' | 'SALE' | 'LEASE' | 'RENT')}
            >
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="All Sources" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sources</SelectItem>
                <SelectItem value="SALE">Sale</SelectItem>
                <SelectItem value="LEASE">Lease</SelectItem>
                <SelectItem value="RENT">Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 md:pt-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch('');
              setMonthFilter('All');
              setBranchFilter('All');
              setSourceFilter('All');
            }}
            className="h-9 text-gray-500 border-gray-200 hover:bg-gray-50 text-xs px-3 rounded-lg"
            title="Clear Filters"
          >
            <FilterX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-blue-50">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {['MONTH', 'BRANCH', 'SOURCE', 'INCOME', 'EXPENSE', 'PROFIT', 'STATUS'].map((h) => (
                <TableHead
                  key={h}
                  className="text-[11px] font-bold text-slate-600 uppercase px-6 py-4"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                  Loading financial data...
                </TableCell>
              </TableRow>
            ) : (
              filteredFinance.map((f, i) => (
                <TableRow key={f.id} className={i % 2 ? 'bg-blue-50/10' : 'bg-card'}>
                  <TableCell className="px-6 py-4 font-medium text-slate-800">{f.month}</TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
                      {f.branchName || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-slate-600">{f.source}</TableCell>
                  <TableCell className="px-6 py-4 font-medium text-blue-600">
                    {formatCurrency(f.income)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    {formatCurrency(f.expense)}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-primary">
                    {formatCurrency(f.profit)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        f.profitStatus === 'profit'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {f.profitStatus}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && filteredFinance.length === 0 && (
          <div className="p-8 text-center text-slate-400 italic">No matching records found.</div>
        )}
      </div>
    </div>
  );
}
