'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Search, Filter, Download, Loader2, Eye, UserCog } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getAllEmployees,
  deleteEmployee,
  createEmployee,
  updateEmployee,
  Employee,
  EmployeeResponse,
} from '@/lib/employee';
import EmployeeFormDialog from '@/components/AdminDahboardComponents/hrComponents/EmployeeFormDialog';
import DeleteEmployeeDialog from '@/components/AdminDahboardComponents/hrComponents/DeleteEmployeeDialog';
import { useRouter } from 'next/navigation';

export default function HREmployeeTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<EmployeeResponse['pagination']>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const response = await getAllEmployees(page, pagination.limit, roleFilter);
        if (response.success) {
          setEmployees(response.data.employees);
          setPagination(response.data.pagination);
        }
      } catch {
        toast.error('Failed to load employee details');
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, roleFilter],
  );

  useEffect(() => {
    fetchEmployees(1);
  }, [fetchEmployees]);

  const branches = Array.from(
    new Set(employees.map((emp) => emp.branch?.name).filter(Boolean)),
  ) as string[];

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.display_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    const matchesBranch = branchFilter === 'All' || emp.branch?.name === branchFilter;
    return matchesSearch && matchesRole && matchesBranch;
  });

  const handleEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsFormOpen(true);
  };

  const handleDeleteTrigger = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (formData: FormData) => {
    try {
      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id, formData);
        toast.success('Employee updated successfully');
      } else {
        await createEmployee(formData);
        toast.success('Employee created successfully');
      }
      fetchEmployees(pagination.page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Action failed');
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee) return;
    try {
      if (selectedEmployee.status === 'ACTIVE') {
        await deleteEmployee(selectedEmployee.id);
        toast.success('Employee disabled successfully');
      } else {
        const formData = new FormData();
        formData.append('status', 'ACTIVE');
        await updateEmployee(selectedEmployee.id, formData);
        toast.success('Employee enabled successfully');
      }
      fetchEmployees(pagination.page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employees..."
              className="pl-10 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm rounded-xl transition-all w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[180px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-xl justify-between px-3"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="h-4 w-4" />
                    <span className="truncate">Role: {roleFilter}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => setRoleFilter('All')}>All Roles</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('MANAGER')}>
                  Manager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('HR')}>HR</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('EMPLOYEE')}>
                  Employee
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('FINANCE')}>
                  Finance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="w-full sm:w-[180px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-xl justify-between px-3"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="h-4 w-4" />
                    <span className="truncate">Branch: {branchFilter}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl max-h-[300px] overflow-y-auto"
              >
                <DropdownMenuItem onClick={() => setBranchFilter('All')}>
                  All Branches
                </DropdownMenuItem>
                {branches.map((branch) => (
                  <DropdownMenuItem key={branch} onClick={() => setBranchFilter(branch)}>
                    {branch}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-xl flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <Table className="w-full text-left">
            <TableHeader className="bg-gray-50/50">
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
                  Phone
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Role
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Branch
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Reporting Manager
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Status
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-3 py-20 text-center text-gray-500 text-sm italic"
                  >
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp, index) => (
                  <TableRow
                    key={emp.id}
                    className={`transition-colors h-11 border-b border-gray-50 hover:bg-primary/5 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'
                    }`}
                  >
                    <TableCell className="px-3 py-1.5 font-medium text-primary whitespace-nowrap">
                      {emp.display_id || '---'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] flex-shrink-0 overflow-hidden relative">
                          {emp.profile_image_url ? (
                            <Image
                              src={emp.profile_image_url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          ) : (
                            (emp.first_name?.[0] || emp.email[0]).toUpperCase()
                          )}
                        </div>
                        <span
                          className="font-medium text-primary cursor-pointer hover:underline"
                          onClick={() => router.push(`/hr/employees/${emp.id}`)}
                        >
                          {emp.first_name} {emp.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {emp.email}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {emp.phone || '---'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap text-center">
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-blue-100 text-blue-700">
                        {emp.role}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {emp.branch?.name || '---'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {emp.reporting_manager || '---'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                        ${
                          emp.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-600' : 'bg-red-600'}`}
                        />
                        {emp.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          title="View Profile"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => router.push(`/hr/employees/${emp.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          title="Disable Access"
                          className={`h-7 w-7 transition-all ${emp.status !== 'ACTIVE' ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                          disabled={emp.status !== 'ACTIVE'}
                          onClick={() => handleDeleteTrigger(emp)}
                        >
                          <svg
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
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Details"
                          className="h-7 w-7 text-gray-400 hover:text-primary hover:bg-primary/5"
                          onClick={() => handleEdit(emp)}
                        >
                          <UserCog className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredEmployees.length} of {pagination.total} employees
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-8 px-4"
              disabled={pagination.page <= 1}
              onClick={() => fetchEmployees(pagination.page - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => (
                <Button
                  key={i + 1}
                  variant={pagination.page === i + 1 ? 'default' : 'outline'}
                  size="sm"
                  className={`w-8 h-8 p-0 rounded-lg ${pagination.page === i + 1 ? 'bg-primary text-white' : ''}`}
                  onClick={() => fetchEmployees(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-8 px-4"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchEmployees(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <EmployeeFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={selectedEmployee}
        onSubmit={handleFormSubmit}
      />

      <DeleteEmployeeDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        employeeName={`${selectedEmployee?.first_name || ''} ${selectedEmployee?.last_name || ''}`}
        employeeStatus={selectedEmployee?.status}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
