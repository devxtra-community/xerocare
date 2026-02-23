'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  MoreVertical,
  Eye,
  UserX,
  UserCog,
  Search,
  Filter,
  Download,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import EmployeeFormDialog from './EmployeeFormDialog';
import DeleteEmployeeDialog from './DeleteEmployeeDialog';
import { toast } from 'sonner';
import {
  getAllEmployees,
  deleteEmployee,
  createEmployee,
  updateEmployee,
  Employee,
  EmployeeResponse,
} from '@/lib/employee';
import { formatCurrency } from '@/lib/format';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { FINANCE_JOB_LABELS, FinanceJob } from '@/lib/financeJob';

/**
 * Table component for listing, filtering, and managing employees.
 * Supports search, role filtering, pagination, and actions (edit/delete/view).
 * Displays key details like branch, salary, status, and join date.
 */
export default function EmployeeTable() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<EmployeeResponse['pagination']>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.display_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
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
    <div className="bg-card rounded-2xl shadow-sm border-0 overflow-hidden text-left">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-primary">Employee List</h3>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                className="pl-10 h-10 w-full md:w-[250px] bg-muted/50 border-none rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl border-border gap-2">
                  <Filter className="h-4 w-4" />
                  Role: {roleFilter}
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
            <Button variant="outline" className="h-10 rounded-xl border-border">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-white"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <Table className="w-full">
          <TableHeader className="bg-muted/50/50">
            <TableRow className="border-b border-gray-100 hover:bg-transparent">
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                ID
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Name
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Role
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Department
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Branch
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Salary
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Expiry
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Joined
              </TableHead>
              <TableHead className="px-3 py-4 text-xs font-semibold text-primary uppercase tracking-wider text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="">
            {!isLoading && filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="px-3 py-20 text-center text-muted-foreground italic"
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
                  <TableCell className="px-3 py-4 text-xs font-bold text-blue-600">
                    {emp.display_id || '---'}
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0 overflow-hidden relative border border-blue-50 shadow-sm group cursor-pointer">
                        {emp.profile_image_url ? (
                          <>
                            <Image
                              src={emp.profile_image_url}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized={true}
                            />
                            <div
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              onClick={() => setPreviewImage(emp.profile_image_url || null)}
                            >
                              <Eye size={16} className="text-white" />
                            </div>
                          </>
                        ) : (
                          (emp.first_name?.[0] || emp.email[0]).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground truncate">
                          {emp.first_name} {emp.last_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{emp.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-700 border-none font-medium px-2 py-0.5 text-[10px]"
                    >
                      {emp.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <span className="text-xs font-medium text-gray-700">
                      {emp.role === 'HR'
                        ? 'HR'
                        : emp.role === 'MANAGER'
                          ? 'Management'
                          : emp.role === 'ADMIN'
                            ? 'Administration'
                            : emp.role === 'FINANCE'
                              ? FINANCE_JOB_LABELS[emp.finance_job as FinanceJob] || 'Finance'
                              : EMPLOYEE_JOB_LABELS[emp.employee_job as EmployeeJob] || 'Staff'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <span className="text-xs text-gray-600">{emp.branch?.name || '---'}</span>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-sm font-semibold text-blue-700 tabular-nums">
                    {formatCurrency(emp.salary || 0)}
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold border-none px-2 py-0.5 ${
                        emp.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : emp.status === 'INACTIVE'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-xs text-muted-foreground">
                    {emp.expire_date
                      ? new Date(emp.expire_date).toLocaleDateString('en-GB')
                      : '---'}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-xs text-muted-foreground">
                    {new Date(emp.createdAt).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          if (emp.id) {
                            router.push(`/admin/human-resource/${emp.id}`);
                          } else {
                            toast.error('Employee ID missing');
                          }
                        }}
                        title="View Profile"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs"
                            onClick={() => handleEdit(emp)}
                          >
                            <UserCog className="h-3.5 w-3.5" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={`gap-2 cursor-pointer text-xs ${emp.status === 'ACTIVE' ? 'text-red-600 focus:text-red-600' : 'text-green-600 focus:text-green-600'}`}
                            onClick={() => handleDeleteTrigger(emp)}
                          >
                            {emp.status === 'ACTIVE' ? (
                              <>
                                <UserX className="h-3.5 w-3.5" /> Disable Access
                              </>
                            ) : (
                              <>
                                <UserCog className="h-3.5 w-3.5" /> Enable Access
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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

      <div className="p-6 border-t border-gray-100 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
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

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Profile Image Preview</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-square flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
            {previewImage && (
              <Image
                src={previewImage}
                alt="Profile Preview"
                fill
                className="object-contain"
                unoptimized={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
