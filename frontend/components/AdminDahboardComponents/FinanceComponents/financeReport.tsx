'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatCard from '@/components/StatCard';
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
  AreaChart,
  Area,
} from 'recharts';
import { getFinanceReport, FinanceReportItem } from '@/lib/invoice';
import { getBranches, Branch } from '@/lib/branch';

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
};

export default function FinanceReport() {
  const [finance, setFinance] = useState<Finance[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'SALE' | 'LEASE' | 'RENT'>('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
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
        });

        // Enrich data with branch names
        const enrichedData = data.map((item: FinanceReportItem, idx: number) => {
          const branch = branches.find((b) => b.id === item.branchId);
          return {
            ...item,
            id: `${item.month}-${item.branchId}-${item.source}-${idx}`,
            branchName: branch ? branch.name : 'Unknown Branch',
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
  }, [branchFilter, sourceFilter, monthFilter, branches]);

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
      const expense = monthData.reduce((s: number, f: Finance) => s + f.expense, 0);
      const profit = income - expense;
      const margin = income > 0 ? parseFloat(((profit / income) * 100).toFixed(1)) : 0;
      return { month: m, income, expense, profit, margin };
    })
    .filter((d) => d.income > 0 || d.expense > 0);

  const averageMargin =
    dynamicChartData.length > 0
      ? (
          dynamicChartData.reduce((s: number, b) => s + b.margin, 0) / dynamicChartData.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="bg-blue-100 min-h-screen p-4 space-y-8 sm:space-y-10">
      {/* Header */}
      <h3 className="text-xl sm:text-2xl font-bold text-primary">Financial Report</h3>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Income"
          value={`₹ ${totalIncome.toLocaleString()}`}
          subtitle={branchFilter === 'All' ? 'All branches' : branchFilter}
        />
        <StatCard
          title="Total Expense"
          value={`₹ ${totalExpense.toLocaleString()}`}
          subtitle={branchFilter === 'All' ? 'All branches' : branchFilter}
        />
        <StatCard
          title="Net Profit"
          value={`₹ ${netProfit.toLocaleString()}`}
          subtitle="Income - Expense"
        />
        <StatCard title="Avg Margin" value={`${averageMargin}%`} subtitle="Filtered performance" />
      </div>

      {/* Monthly Performance Charts */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Income vs Expense Chart */}
        <div className="flex-1 bg-card p-4 rounded-2xl shadow-sm space-y-4 border border-blue-50">
          <h4 className="text-lg sm:text-xl font-bold text-primary">Income vs Expense (Monthly)</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dynamicChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  tickFormatter={(v) => `₹${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
                <Bar
                  dataKey="income"
                  name="Income"
                  barSize={24}
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  barSize={24}
                  fill="#93c5fd"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit Trend"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Margin Chart */}
        <div className="flex-1 bg-card p-4 rounded-2xl shadow-sm space-y-4 border border-blue-50">
          <h4 className="text-lg sm:text-xl font-bold text-primary">Profit Margin % (Monthly)</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dynamicChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  unit="%"
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Profit Margin']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="margin"
                  name="Profit Margin"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMargin)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search report..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 bg-card shadow-sm transition-all"
          />
        </div>

        <div className="w-[180px]">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-11 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl shadow-sm">
              <SelectValue placeholder="All Months" />
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

        <div className="w-[200px]">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-11 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl shadow-sm">
              <SelectValue placeholder="All Branches" />
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

        <div className="w-[150px]">
          <Select
            value={sourceFilter}
            onValueChange={(val) => setSourceFilter(val as 'All' | 'SALE' | 'LEASE' | 'RENT')}
          >
            <SelectTrigger className="h-11 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl shadow-sm">
              <SelectValue placeholder="All Sources" />
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
                    ₹ {f.income.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    ₹ {f.expense.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-primary">
                    ₹ {f.profit.toLocaleString()}
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
