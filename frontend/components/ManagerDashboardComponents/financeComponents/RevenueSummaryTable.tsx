'use client';

import React, { useState, useMemo, useEffect } from 'react';
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

import { getFinanceReport, FinanceReportItem } from '@/lib/invoice';
import { formatCurrency } from '@/lib/format';
import { Search, Loader2 } from 'lucide-react';

interface RevenueSummaryTableProps {
  selectedYear?: number | 'all';
}

/**
 * Table summarizing daily revenue by type.
 * Shows invoice counts, total amounts, paid amounts per day and type.
 * Includes search and filtering by date, month, and revenue type.
 */
export default function RevenueSummaryTable({ selectedYear }: RevenueSummaryTableProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinanceReportItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const report = await getFinanceReport({
          year: selectedYear === 'all' ? undefined : selectedYear,
        });
        setData(report);
      } catch (error) {
        console.error('Failed to fetch finance report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  const filteredData = useMemo(() => {
    return data.filter((item: FinanceReportItem) => {
      // 1. Text Search
      const matchesSearch =
        item.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.month.includes(searchTerm);

      if (!matchesSearch) return false;

      // 2. Month Filter
      if (filterMonth !== 'all') {
        const itemMonth = new Date(item.month).getMonth().toString();
        if (itemMonth !== filterMonth) return false;
      }

      // 3. Type Filter
      if (filterType !== 'all' && item.source !== filterType) return false;

      return true;
    });
  }, [data, searchTerm, filterMonth, filterType]);

  const uniqueTypes = useMemo(() => Array.from(new Set(data.map((d) => d.source))), [data]);

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
          {(searchTerm || filterMonth !== 'all' || filterType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
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
                Month
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase">Type</TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase text-center">
                Total Orders
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary uppercase">
                Revenue
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading report data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length > 0 ? (
              filteredData.map((row, i) => (
                <TableRow
                  key={i}
                  className={`hover:bg-blue-50/30 transition-colors ${
                    i % 2 ? 'bg-blue-50/20' : 'bg-card'
                  }`}
                >
                  <TableCell className="text-xs font-medium text-gray-600 px-4">
                    {row.month}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                  ${
                    row.source === 'SALE'
                      ? 'bg-blue-100 text-blue-700'
                      : row.source === 'RENT'
                        ? 'bg-purple-100 text-purple-700'
                        : row.source === 'LEASE'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                  }`}
                    >
                      {row.source}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-primary text-center">
                    {row.count}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground">
                    {formatCurrency(row.income)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
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
