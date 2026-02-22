'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StandardTable } from '@/components/table/StandardTable';
import { usePagination } from '@/hooks/usePagination';
import { getAllEmployees, Employee } from '@/lib/employee';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Table component for viewing and managing employee records in the Manager Dashboard.
 * Fetches real paginated data from the backend.
 */
export default function EmployeeTable() {
  const router = useRouter();
  const { page, limit, total, setPage, setLimit, setTotal, totalPages } = usePagination(10);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllEmployees(page, limit, role, search);
      if (res && res.success && res.data) {
        setEmployees(res.data.employees || []);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch employees', error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  }, [page, limit, role, search, setTotal]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchEmployees();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchEmployees]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, role, setPage]);

  const toggleStatus = (id: string, newStatus: string) => {
    toast('Status updates via table are display-only until API is ready');
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, status: newStatus } : emp)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search employees..."
            className="pl-10 h-10 bg-card border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm rounded-xl transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-10 bg-card border-blue-400/60 rounded-xl focus:ring-blue-100 shadow-sm">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Departments</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
              <SelectItem value="FINANCE">Finance</SelectItem>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <StandardTable
          columns={[
            {
              id: 'employeeId',
              header: 'EMPLOYEE ID',
              className: 'px-3 py-2 text-[10px] font-bold text-primary uppercase',
              cell: (emp: Employee) => (
                <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                  {emp.display_id || `EMP-${emp.id.substring(0, 4)}`}
                </span>
              ),
            },
            {
              id: 'name',
              header: 'NAME',
              className: 'px-3 py-2 text-[10px] font-bold text-primary uppercase',
              cell: (emp: Employee) => {
                const fullName =
                  `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
                return (
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] flex-shrink-0">
                      {fullName.charAt(0)}
                    </div>
                    <span className="text-[12px] font-bold text-foreground">{fullName}</span>
                  </div>
                );
              },
            },
            {
              id: 'email',
              header: 'EMAIL',
              className: 'px-3 py-2 text-[10px] font-bold text-primary uppercase',
              cell: (emp: Employee) => (
                <span className="text-[11px] text-gray-600 whitespace-nowrap">{emp.email}</span>
              ),
            },
            {
              id: 'department',
              header: 'DEPARTMENT',
              className: 'px-3 py-2 text-[10px] font-bold text-primary uppercase',
              cell: (emp: Employee) => {
                const role = emp.role || 'Unknown';
                return (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase
                    ${
                      role === 'Sales'
                        ? 'bg-blue-100 text-blue-700'
                        : role === 'Service'
                          ? 'bg-purple-100 text-purple-700'
                          : role === 'Inventory'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {role}
                  </span>
                );
              },
            },
            {
              id: 'branch',
              header: 'BRANCH',
              className: 'px-3 py-2 text-[10px] font-bold text-primary uppercase',
              cell: (emp: Employee) => (
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {emp.branch?.name || 'Main Branch'}
                </span>
              ),
            },
            {
              id: 'status',
              header: 'STATUS',
              className: 'px-3 py-2 text-[10px] font-bold text-primary uppercase',
              cell: (emp: Employee) => (
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
                  {emp.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              id: 'actions',
              header: 'ACTIONS',
              className:
                'px-3 py-2 text-[10px] font-bold text-primary uppercase text-center w-[120px]',
              cell: (emp: Employee) => (
                <div className="flex items-center justify-end gap-1">
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
                    disabled={emp.status === 'ACTIVE'}
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
                    disabled={emp.status !== 'ACTIVE'}
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
              ),
            },
          ]}
          data={employees}
          loading={loading}
          emptyMessage="No employees found matching your search."
          keyExtractor={(emp) => emp.id}
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
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
