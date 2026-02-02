'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Search, Filter, Download, Loader2, Eye } from 'lucide-react';
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
import { getAllEmployees, Employee, EmployeeResponse } from '@/lib/employee';
import HRAttendanceDetailDialog, {
  AttendanceEmployee,
} from '@/components/HrComponents/HRAttendanceDetailDialog';

export default function HRAttendanceTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [pagination, setPagination] = useState<EmployeeResponse['pagination']>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<AttendanceEmployee | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchEmployees = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const response = await getAllEmployees(page, pagination.limit, roleFilter);
        if (response.success) {
          // Augment with mock attendance data
          const augmented: AttendanceEmployee[] = response.data.employees.map((emp: Employee) => ({
            ...emp,
            attendanceCount: Math.floor(Math.random() * 25) + 5, // 5-30 days
            leaveCount: Math.floor(Math.random() * 5), // 0-5 days
            lateCount: Math.floor(Math.random() * 8), // 0-8 days
            todayStatus: Math.random() > 0.1 ? 'Present' : 'On Leave',
          }));
          setEmployees(augmented);
          setPagination(response.data.pagination);
        }
      } catch {
        toast.error('Failed to load attendance records');
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
      emp.display_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || emp.todayStatus === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleViewDetails = (emp: AttendanceEmployee) => {
    setSelectedEmployee(emp);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by ID or name..."
              className="pl-10 h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-xl justify-between px-3 min-w-[120px]"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="truncate">{roleFilter}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => setRoleFilter('All')}>All Roles</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('MANAGER')}>
                  Manager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('EMPLOYEE')}>
                  Employee
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('HR')}>HR</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('FINANCE')}>
                  Finance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-xl justify-between px-3 min-w-[120px]"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="truncate">
                    {statusFilter === 'All' ? 'All Status' : statusFilter}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-40">
                <DropdownMenuItem onClick={() => setStatusFilter('All')}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('Present')}>
                  Present
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('On Leave')}>
                  Absent / Leave
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-xl"
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
                  Date
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Name
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Role
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">
                  Branch
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Status
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Attendance
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-center">
                  Leaves
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-3 py-20 text-center text-gray-500 text-sm italic"
                  >
                    Loading attendance records...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-3 py-20 text-center text-gray-500 text-sm italic"
                  >
                    No attendance records found
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
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {new Date().toLocaleDateString()}
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
                        <span className="font-medium text-primary">
                          {emp.first_name} {emp.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap text-center">
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-blue-100 text-blue-700">
                        {emp.role}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {emp.branch?.name || '---'}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                        ${
                          emp.todayStatus === 'Present'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${emp.todayStatus === 'Present' ? 'bg-green-600' : 'bg-red-600'}`}
                        />
                        {emp.todayStatus}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold text-primary">{emp.attendanceCount}</span>
                        <span className="text-[10px] text-gray-400 font-medium italic">days</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold text-primary">{emp.leaveCount}</span>
                        <span className="text-[10px] text-gray-400 font-medium italic">days</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleViewDetails(emp)}
                          title="View Attendance Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
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

      <HRAttendanceDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        employee={selectedEmployee}
      />
    </div>
  );
}
