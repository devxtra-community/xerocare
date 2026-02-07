'use client';

import React, { useState } from 'react';
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
import { Search, Download, Filter, Edit2 } from 'lucide-react';
import UpdatePayrollDialog from './UpdatePayrollDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data type
export type PayrollRecord = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  branch: string;
  salaryPerMonth: string;
  workingDays: number;
  leaveDays: number;
  grossSalary: string;
  status: 'PAID' | 'PENDING';
  paidDate: string;
};

// Mock data
const MOCK_PAYROLL: PayrollRecord[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: 'John Doe',
    email: 'john@example.com',
    branch: 'Cochin',
    salaryPerMonth: '₹ 45,000',
    workingDays: 22,
    leaveDays: 2,
    grossSalary: '₹ 5,40,000',
    status: 'PAID',
    paidDate: '2024-01-31',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: 'Jane Smith',
    email: 'jane@example.com',
    branch: 'Dubai',
    salaryPerMonth: '₹ 55,000',
    workingDays: 24,
    leaveDays: 0,
    grossSalary: '₹ 6,60,000',
    status: 'PENDING',
    paidDate: '-',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    branch: 'Cochin',
    salaryPerMonth: '₹ 35,000',
    workingDays: 20,
    leaveDays: 4,
    grossSalary: '₹ 4,20,000',
    status: 'PAID',
    paidDate: '2024-01-31',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    branch: 'Bangalore',
    salaryPerMonth: '₹ 65,000',
    workingDays: 23,
    leaveDays: 1,
    grossSalary: '₹ 7,80,000',
    status: 'PENDING',
    paidDate: '-',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    name: 'Robert Brown',
    email: 'robert@example.com',
    branch: 'Cochin',
    salaryPerMonth: '₹ 40,000',
    workingDays: 22,
    leaveDays: 2,
    grossSalary: '₹ 4,80,000',
    status: 'PAID',
    paidDate: '2024-01-31',
  },
];

export default function HRPayrollTable() {
  const [data, setData] = useState<PayrollRecord[]>(MOCK_PAYROLL);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const handleEditClick = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsUpdateOpen(true);
  };

  const handleUpdateSubmit = (id: string, updatedData: Partial<PayrollRecord>) => {
    setData((prev) => prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item)));
  };

  const filteredData = data.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, ID or email..."
              className="pl-10 h-10 bg-card border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm rounded-xl transition-all w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[180px]">
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
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => setStatusFilter('All')}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('PAID')}>Paid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('PENDING')}>
                  Pending
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
                  Employee ID
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Name
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Email
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Branch
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-right">
                  Salary/Month
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Work Days
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Leave Days
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-right">
                  Gross Salary
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Status
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Paid Date
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
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
                    <TableCell className="px-3 py-1.5 font-medium text-primary whitespace-nowrap">
                      {record.employeeId}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap font-medium text-primary">
                      {record.name}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {record.email}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap">{record.branch}</TableCell>
                    <TableCell className="px-3 py-1.5 font-medium whitespace-nowrap text-right text-primary">
                      {record.salaryPerMonth}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap text-center">
                      {record.workingDays}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap text-center">
                      {record.leaveDays}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 font-bold whitespace-nowrap text-right text-primary">
                      {record.grossSalary}
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
                    <TableCell className="px-3 py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleEditClick(record)}
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
    </div>
  );
}
