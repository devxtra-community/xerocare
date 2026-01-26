'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, ArrowUpRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

import PageHeader from '@/components/Finance/pageHeader';
import StatusBadge from '@/components/Finance/statusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

import { arCustomers, arInvoices, arPayments } from '@/lib/finance/ar';

export default function SalesInvoiceListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState<Date | null>(null);

  // Initialize date on mount to prevent Hydration Mismatch
  // Fixes: "Calling setState synchronously within an effect can trigger cascading renders"
  useEffect(() => {
    // Delays the state update to the next tick to avoid synchronous update warning/error
    // while still ensuring "now" is set on the client.
    const timer = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(timer);
  }, []);

  /* ---------- Derived Data Logic ---------- */
  const invoicesWithDerivedData = useMemo(() => {
    return arInvoices.map((inv) => {
      // Calculate total paid via applied payments
      const paid = arPayments
        .filter((p) => p.status === 'Posted')
        .flatMap((p) => p.appliedInvoices)
        .filter((a) => a.invoiceId === inv.id)
        .reduce((sum, a) => sum + a.appliedAmount, 0);

      const balance = inv.totalAmount - paid;
      const isFullyPaid = balance <= 0;

      // Overdue logic: Only if we have a balance and the date has passed
      const isOverdue =
        now && !isFullyPaid && inv.status !== 'Draft'
          ? new Date(inv.dueDate) < new Date(now.setHours(0, 0, 0, 0))
          : false;

      const customer = arCustomers.find((c) => c.id === inv.customerId)?.name ?? 'Unknown';

      // Determine a functional status for filtering
      let derivedStatus = inv.status;
      if (inv.status === 'Posted') {
        if (isFullyPaid) derivedStatus = 'Paid';
        else if (paid > 0) derivedStatus = 'Partially_Paid';
      }

      return {
        ...inv,
        paid,
        balance,
        isOverdue,
        customerName: customer,
        calculatedStatus: derivedStatus,
      };
    });
  }, [now]);

  /* ---------- Filtering Logic ---------- */
  const filteredInvoices = useMemo(() => {
    return invoicesWithDerivedData.filter((inv) => {
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Overdue' ? inv.isOverdue : inv.calculatedStatus === statusFilter);

      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [invoicesWithDerivedData, statusFilter, searchQuery]);

  // Global KPIs based on filtered context
  const totalOutstanding = useMemo(
    () => invoicesWithDerivedData.reduce((sum, inv) => sum + inv.balance, 0),
    [invoicesWithDerivedData],
  );

  const overdueTotal = useMemo(
    () =>
      invoicesWithDerivedData.filter((i) => i.isOverdue).reduce((sum, inv) => sum + inv.balance, 0),
    [invoicesWithDerivedData],
  );

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <PageHeader
        title="Sales Invoices"
        description="Accounts Receivable – Customer Invoices & Collections"
      />

      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Outstanding"
          value={totalOutstanding}
          icon={<ArrowUpRight className="text-blue-600" />}
        />
        <StatsCard
          title="Overdue Balance"
          value={overdueTotal}
          icon={<AlertCircle className="text-destructive" />}
          isRisk
        />
        <StatsCard
          title="Invoices (MTD)"
          value={invoicesWithDerivedData.length}
          isCount
          icon={<CheckCircle2 className="text-green-600" />}
        />
      </div>

      {/* 2. Search & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice or customer..."
            className="pl-10 bg-slate-50/50 border-none h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 bg-white border-slate-200">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="All">All Invoices</SelectItem>
              <SelectItem value="Draft">Drafts</SelectItem>
              <SelectItem value="Posted">Posted</SelectItem>
              <SelectItem value="Partially_Paid">Partially Paid</SelectItem>
              <SelectItem value="Paid">Fully Paid</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[140px] pl-6">Invoice No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right font-bold text-slate-900 pr-6">Balance</TableHead>
              <TableHead className="pl-8">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-24 text-muted-foreground">
                  No invoices found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="group hover:bg-slate-50/30 transition-colors">
                  <TableCell className="font-bold text-blue-600 pl-6">
                    <Link href={`/finance/ar/invoices/${inv.id}`}>{inv.invoiceNumber}</Link>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">{inv.customerName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{inv.issueDate}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {inv.dueDate}
                      {inv.isOverdue && (
                        <Clock className="w-3.5 h-3.5 text-destructive animate-pulse" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {inv.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900 pr-6">
                    {inv.balance.toLocaleString()}
                  </TableCell>
                  <TableCell className="pl-8">
                    <StatusBadge status={inv.status} isOverdue={inv.isOverdue} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ---------- Reusable Components ---------- */

function StatsCard({
  title,
  value,
  icon,
  isRisk,
  isCount,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  isRisk?: boolean;
  isCount?: boolean;
}) {
  return (
    <Card className="shadow-sm border-none bg-white ring-1 ring-slate-200">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <h3
            className={`text-2xl font-black ${isRisk && value > 0 ? 'text-destructive' : 'text-slate-900'}`}
          >
            {!isCount && 'AED '}
            {value.toLocaleString()}
          </h3>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
      </CardContent>
    </Card>
  );
}
