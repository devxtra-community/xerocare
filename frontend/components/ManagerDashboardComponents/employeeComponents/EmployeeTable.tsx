'use client';

import React, { useState, useEffect } from 'react';
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
import { Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllEmployees, updateEmployee, Employee } from '@/lib/employee';
import { toast } from 'sonner';

/**
 * Table component for viewing and managing employee records in the Manager Dashboard.
 * Supports searching and provides actions to enable/disable employee accounts.
 */
export default function EmployeeTable() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await getAllEmployees(page, 10);
      if (res.success) {
        setEmployees(res.data.employees);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page]);

  const toggleStatus = async (id: string, newStatus: string) => {
    try {
      // Create a FormData object for the status update as per updateEmployee signature
      const res = await updateEmployee(id, { status: newStatus });
      if (res.success) {
        toast.success(`Employee ${newStatus.toLowerCase()} successfully`);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      `${emp.first_name || ''} ${emp.last_name || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      (emp.role || '').toLowerCase().includes(search.toLowerCase()),
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

      <div className="bg-card rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] relative">
        {loading && (
          <div className="absolute inset-0 bg-card/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}
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
                  Role
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Department
                </TableHead>
                <TableHead className="px-3 py-2 text-[10px] font-bold text-primary uppercase">
                  Display ID
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
              {filteredEmployees.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp, index) => (
                  <TableRow
                    key={emp.id}
                    className={`transition-colors h-11 border-b border-gray-50 hover:bg-primary/5 ${
                      index % 2 === 0 ? 'bg-card' : 'bg-blue-50/20'
                    }`}
                  >
                    <TableCell className="px-3 py-1.5 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                      {emp.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] flex-shrink-0 overflow-hidden">
                          {emp.profile_image_url ? (
                            <img
                              src={emp.profile_image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (emp.first_name?.[0] || emp.email[0]).toUpperCase()
                          )}
                        </div>
                        <span className="text-[12px] font-bold text-foreground">
                          {emp.first_name} {emp.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">
                      {emp.email}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-blue-100 text-blue-700">
                        {emp.role}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap text-[11px] font-medium text-gray-700">
                      {(() => {
                        if (emp.role === 'MANAGER') return 'Branch Manager';
                        if (emp.employee_job === 'EMPLOYEE_MANAGER') return 'Employee Manager';
                        if (emp.role === 'FINANCE') return 'Finance Staff';

                        const job = emp.finance_job || emp.employee_job;
                        if (!job) return 'Other';

                        const formattedJob = job
                          .toLowerCase()
                          .replace('finance_', '')
                          .split('_')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' & ');

                        const base =
                          formattedJob === 'Sales' ? 'Sales Staff' : `${formattedJob} Staff`;
                        return base;
                      })()}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      {emp.display_id || 'N/A'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                        ${
                          emp.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-600' : 'bg-orange-600'}`}
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
                            emp.status === 'ACTIVE'
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          disabled={emp.status === 'ACTIVE' || loading}
                          onClick={() => toggleStatus(emp.id, 'ACTIVE')}
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
                            emp.status !== 'ACTIVE'
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          disabled={emp.status !== 'ACTIVE' || loading}
                          onClick={() => toggleStatus(emp.id, 'INACTIVE')}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-[10px] text-muted-foreground font-medium">
          Showing page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] px-2 rounded-lg border-blue-200"
            disabled={page === 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] px-2 rounded-lg border-blue-200"
            disabled={page === totalPages || loading}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
