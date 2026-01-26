'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Calendar, ArrowDownLeft, Clock, ChevronRight } from 'lucide-react';

import { apInvoices, vendors } from '@/lib/finance/ap';
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
import { Button } from '@/components/ui/button';

type DateRange = 'all' | 'today' | 'last_7' | 'last_30' | 'this_month' | 'last_month' | 'custom';

export default function APInvoiceListPage() {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* ---------- Logic ---------- */
  const filteredInvoices = useMemo(() => {
    return apInvoices.filter((inv) => {
      // Date Logic
      const date = new Date(inv.invoiceDate);
      const today = new Date();
      let dateMatch = true;

      if (dateRange === 'today') dateMatch = date.toDateString() === today.toDateString();
      else if (dateRange === 'last_7')
        dateMatch = date >= new Date(today.setDate(today.getDate() - 7));
      else if (dateRange === 'this_month') dateMatch = date.getMonth() === new Date().getMonth();
      else if (dateRange === 'custom' && fromDate && toDate) {
        dateMatch = date >= new Date(fromDate) && date <= new Date(toDate);
      }

      // Search Logic
      const vendor = vendors.find((v) => v.id === inv.vendorId);
      const searchText = search.toLowerCase();
      const searchMatch =
        !search ||
        inv.invoiceNumber.toLowerCase().includes(searchText) ||
        vendor?.name.toLowerCase().includes(searchText);

      return dateMatch && searchMatch;
    });
  }, [search, dateRange, fromDate, toDate]);

  // Analytics Logic
  const totalPayable = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingApproval = filteredInvoices.filter((i) => i.status === 'Pending_Approval').length;

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Vendor Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage accounts payable and vendor obligations.
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">Record Vendor Invoice</Button>
      </div>

      {/* 1. AP Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Payables"
          value={totalPayable}
          currency="AED"
          icon={<ArrowDownLeft className="text-blue-600" />}
        />
        <StatsCard
          title="Pending Approval"
          value={pendingApproval}
          isCount
          icon={<Clock className="text-amber-600" />}
        />
        <StatsCard
          title="Avg. Payment Term"
          value="14 Days"
          isText
          icon={<Calendar className="text-slate-600" />}
        />
      </div>

      {/* 2. Advanced Toolbar */}
      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by vendor or invoice #..."
              className="pl-10 bg-slate-50/50 border-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[180px] bg-white">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                <Input
                  type="date"
                  className="w-40 h-9"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  className="w-40 h-9"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Invoice Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="pl-6">Invoice & Vendor</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-6">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No vendor invoices found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => {
                const vendor = vendors.find((v) => v.id === inv.vendorId);
                return (
                  <TableRow
                    key={inv.id}
                    className="group cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="pl-6 py-4">
                      <Link href={`/finance/ap/invoices/${inv.id}`} className="block">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                          {inv.invoiceNumber}
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5 uppercase tracking-tighter">
                          {vendor?.name || 'Unknown Vendor'}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-700">
                        Issued: {inv.invoiceDate}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Due: {inv.dueDate}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="font-black text-slate-900">
                        {inv.currency} {inv.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">
                        Net 30 Terms
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ---------- UI Components ---------- */

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  currency?: string;
  isText?: boolean;
  isCount?: boolean;
}

function StatsCard({ title, value, icon, currency, isText }: StatsCardProps) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {title}
          </p>
          <p className="text-2xl font-black text-slate-900">
            {currency && <span className="text-sm font-medium mr-1">{currency}</span>}
            {isText ? value : value.toLocaleString()}
          </p>
        </div>
        <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
