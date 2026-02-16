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
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

const mockEmployees = [
  {
    id: 1,
    name: 'Arjun Mehta',
    email: 'arjun@xerocare.com',
    department: 'Sales',
    status: 'Active',
    joiningDate: '2023-01-15',
    visaExpire: '2025-06-12',
  },
  {
    id: 2,
    name: 'Suhail Khan',
    email: 'suhail@xerocare.com',
    department: 'Service',
    status: 'On Leave',
    joiningDate: '2022-11-01',
    visaExpire: '2024-12-30',
  },
  {
    id: 3,
    name: 'Priya Sharma',
    email: 'priya@xerocare.com',
    department: 'Inventory',
    status: 'Active',
    joiningDate: '2023-03-10',
    visaExpire: '2026-01-15',
  },
  {
    id: 4,
    name: 'Aditya Rao',
    email: 'aditya@xerocare.com',
    department: 'Finance',
    status: 'Active',
    joiningDate: '2021-09-05',
    visaExpire: '2025-09-05',
  },
  {
    id: 5,
    name: 'Zoya Ahmed',
    email: 'zoya@xerocare.com',
    department: 'Sales',
    status: 'Active',
    joiningDate: '2023-05-20',
    visaExpire: '2024-10-18',
  },
  {
    id: 6,
    name: 'Rahul Varma',
    email: 'rahul@xerocare.com',
    department: 'Service',
    status: 'Active',
    joiningDate: '2022-02-14',
    visaExpire: '2025-02-14',
  },
];

/**
 * Table component for viewing and managing employee records in the Manager Dashboard.
 * Supports searching and provides actions to enable/disable employee accounts.
 */
export default function EmployeeTable() {
  const router = useRouter();
  const [employees, setEmployees] = useState(mockEmployees);
  const [search, setSearch] = useState('');

  const toggleStatus = (id: number, newStatus: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, status: newStatus } : emp)),
    );
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search employees..."
            className="pl-10 h-10 bg-card border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm rounded-xl transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <Table className="w-full text-left">
            <TableHeader className="bg-muted/50/50">
              <TableRow className="border-b border-gray-100 hover:bg-transparent">
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Employee ID
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Name
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Email
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Department
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Branch
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Manager
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Status
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="">
              {filteredEmployees.map((emp, index) => (
                <TableRow
                  key={emp.id}
                  className={`transition-colors h-11 border-b border-gray-50 hover:bg-primary/5 ${
                    index % 2 === 0 ? 'bg-card' : 'bg-blue-50/20'
                  }`}
                >
                  <TableCell className="px-3 py-1.5 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                    EMP-{emp.id.toString().padStart(4, '0')}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] flex-shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="text-[12px] font-bold text-foreground">{emp.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">
                    {emp.email}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase
                      ${
                        emp.department === 'Sales'
                          ? 'bg-blue-100 text-blue-700'
                          : emp.department === 'Service'
                            ? 'bg-purple-100 text-purple-700'
                            : emp.department === 'Inventory'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {emp.department}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                    Main Branch
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                    Reporting Manager
                  </TableCell>
                  <TableCell className="px-3 py-1.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                      ${
                        emp.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${emp.status === 'Active' ? 'bg-green-600' : 'bg-orange-600'}`}
                      />
                      {emp.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View Details"
                        className="h-7 w-7 text-gray-400 hover:text-primary hover:bg-primary/5"
                        onClick={() => router.push(`/manager/employees/${emp.id}`)}
                      >
                        <Search className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Enable"
                        className={`h-7 w-7 transition-all ${
                          emp.status === 'Active'
                            ? 'text-gray-200 cursor-not-allowed'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        disabled={emp.status === 'Active'}
                        onClick={() => toggleStatus(emp.id, 'Active')}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Disable"
                        className={`h-7 w-7 transition-all ${
                          emp.status !== 'Active'
                            ? 'text-gray-200 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        disabled={emp.status !== 'Active'}
                        onClick={() => toggleStatus(emp.id, 'Disabled')}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
