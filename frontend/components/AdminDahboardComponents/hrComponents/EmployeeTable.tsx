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
    <div className="bg-white rounded-2xl shadow-sm border-0 overflow-hidden">
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
                className="pl-10 w-full md:w-[250px] bg-gray-50 border-none rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-gray-200 gap-2">
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
            <Button variant="outline" className="rounded-xl border-gray-200">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              className="rounded-xl bg-primary hover:bg-primary/90 text-white"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Salary
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Expiry
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!isLoading && filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                  No employees found
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp, index) => (
                <tr key={emp.id} className={index % 2 === 1 ? 'bg-sky-50/60' : 'bg-white'}>
                  <td className="px-6 py-4 text-xs font-bold text-blue-600">
                    {emp.display_id || '---'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0 overflow-hidden relative">
                        {emp.profile_image_url ? (
                          <Image src={emp.profile_image_url} alt="" fill className="object-cover" />
                        ) : (
                          (emp.first_name?.[0] || emp.email[0]).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {emp.first_name} {emp.last_name}
                        </span>
                        <span className="text-xs text-gray-500">{emp.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-700 border-none font-medium"
                    >
                      {emp.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{emp.branch?.name || '---'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-700 tabular-nums">
                    AED {emp.salary?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold border-none ${
                        emp.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : emp.status === 'INACTIVE'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {emp.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {emp.expire_date
                      ? new Date(emp.expire_date).toLocaleDateString('en-GB')
                      : '---'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(emp.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                            className="gap-2 cursor-pointer"
                            onClick={() => handleEdit(emp)}
                          >
                            <UserCog className="h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={`gap-2 cursor-pointer ${emp.status === 'ACTIVE' ? 'text-red-600 focus:text-red-600' : 'text-green-600 focus:text-green-600'}`}
                            onClick={() => handleDeleteTrigger(emp)}
                          >
                            {emp.status === 'ACTIVE' ? (
                              <>
                                <UserX className="h-4 w-4" /> Disable Access
                              </>
                            ) : (
                              <>
                                <UserCog className="h-4 w-4" /> Enable Access
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            {[...Array(pagination.totalPages)].map((_, i) => (
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
  );
}
