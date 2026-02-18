'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Search, Filter, Download, Loader2, Plus, Eye, UserCog } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
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

/**
 * HR Employee Management Component.
 * Comprehensive table for managing employee records with CRUD capabilities.
 * Features:
 * - List all employees with pagination.
 * - Add new employees.
 * - Edit existing employee details.
 * - Enable/Disable employee access (Soft delete).
 * - Filter by Role and Branch.
 */
/**
 * HR Employee Management Table.
 * Provides a comprehensive interface for managing employee records, including
 * adding, editing, enabling/disabling, and filtering by role and branch.
 */
export default function HREmployeeManagementTable() {
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

  // Extract unique branches from the employee list
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

  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

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
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Action failed');
      return false;
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
                  className="w-full h-10 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl justify-between px-3"
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
            className="h-10 bg-card border-blue-400/60 focus:ring-blue-100 rounded-xl flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-white flex-1 sm:flex-none"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
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
                  Branch
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
              {!isLoading && filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-3 py-20 text-center text-muted-foreground text-sm italic"
                  >
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
                              unoptimized={true}
                            />
                          ) : (
                            (emp.first_name?.[0] || emp.email[0]).toUpperCase()
                          )}
                        </div>
                        <span className="text-[12px] font-bold text-primary">
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
                    <TableCell className="px-3 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      {emp.branch?.name || '---'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                        ${
                          emp.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            emp.status === 'ACTIVE' ? 'bg-green-600' : 'bg-red-600'
                          }`}
                        />
                        {emp.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => router.push(`/hr/employees/${emp.id}`)}
                          title="View Profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Enable Access"
                          className={`h-7 w-7 transition-all ${
                            emp.status === 'ACTIVE'
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          disabled={emp.status === 'ACTIVE'}
                          onClick={() => handleDeleteTrigger(emp)}
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
                          title="Disable Access"
                          className={`h-7 w-7 transition-all ${
                            emp.status !== 'ACTIVE'
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          disabled={emp.status !== 'ACTIVE'}
                          onClick={() => handleDeleteTrigger(emp)}
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
