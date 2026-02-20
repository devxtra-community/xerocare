'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

const data = [
  {
    date: '2024-03-25',
    type: 'Sales',
    count: 12,
    total: '₹45,200',
    paid: '₹45,200',
    pending: '₹0',
  },
  {
    date: '2024-03-24',
    type: 'Rental',
    count: 8,
    total: '₹12,800',
    paid: '₹8,000',
    pending: '₹4,800',
  },
  {
    date: '2024-03-24',
    type: 'Lease',
    count: 3,
    total: '₹85,000',
    paid: '₹40,000',
    pending: '₹45,000',
  },
  {
    date: '2024-03-23',
    type: 'Service',
    count: 15,
    total: '₹22,500',
    paid: '₹22,500',
    pending: '₹0',
  },
  { date: '2024-03-22', type: 'Sales', count: 9, total: '₹31,400', paid: '₹31,400', pending: '₹0' },
];

interface RevenueSummaryTableProps {
  selectedYear?: number | 'all';
}

/**
 * Table summarizing daily revenue by type.
 * Shows invoice counts, total amounts, paid amounts per day and type.
 * Includes search and filtering by date, month, and revenue type.
 */
export default function RevenueSummaryTable({ selectedYear }: RevenueSummaryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Text Search
      const matchesSearch =
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.date.includes(searchTerm) ||
        item.total.includes(searchTerm);

      if (!matchesSearch) return false;

      // 2. Date Filter
      if (filterDate && item.date !== filterDate) return false;

      // 3. Month Filter
      if (filterMonth !== 'all') {
        const itemMonth = new Date(item.date).getMonth().toString();
        if (itemMonth !== filterMonth) return false;
      }

      // 4. Type Filter
      if (filterType !== 'all' && item.type !== filterType) return false;

      // 5. Year Filter (from prop)
      if (selectedYear && selectedYear !== 'all') {
        const itemYear = new Date(item.date).getFullYear();
        if (itemYear !== selectedYear) return false;
      }

      return true;
    });
  }, [searchTerm, filterDate, filterMonth, filterType, selectedYear]);

  // Extract unique types for filter dropdown
  const uniqueTypes = Array.from(new Set(data.map((d) => d.type)));

  const months = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl shadow-sm border border-blue-100">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-9 h-9 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Date Filter */}
          <div className="relative">
            <Input
              type="date"
              className="h-9 w-[130px] text-xs"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {/* Month Filter */}
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-9 w-[120px] text-xs">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-[120px] text-xs">
              <SelectValue placeholder="Revenue Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {(searchTerm || filterDate || filterMonth !== 'all' || filterType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterDate('');
                setFilterMonth('all');
                setFilterType('all');
              }}
              className="text-xs text-muted-foreground hover:text-primary px-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[11px] font-bold text-primary uppercase py-4 px-4">
                Date
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase">
                Revenue Type
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase text-center">
                Invoices
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase">
                Total Amount
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase">Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((row, i) => (
                <TableRow
                  key={i}
                  className={`hover:bg-blue-50/30 transition-colors ${
                    i % 2 ? 'bg-blue-50/20' : 'bg-card'
                  }`}
                >
                  <TableCell className="text-xs font-medium text-gray-600 px-4">
                    {row.date}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                  ${
                    row.type === 'Sales'
                      ? 'bg-blue-100 text-blue-700'
                      : row.type === 'Rental'
                        ? 'bg-purple-100 text-purple-700'
                        : row.type === 'Lease'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                  }`}
                    >
                      {row.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-primary text-center">
                    {row.count}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground">{row.total}</TableCell>
                  <TableCell className="text-xs font-bold text-green-600">{row.paid}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                  No matching records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
