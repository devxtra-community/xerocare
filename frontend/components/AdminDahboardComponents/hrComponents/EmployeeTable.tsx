'use client';

import React, { useState } from 'react';
import {
  MoreVertical,
  Eye,
  UserX,
  UserCog,
  Search,
  Filter,
  Download,
  Plus,
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

const mockEmployees = [
  {
    id: 'EMP001',
    name: 'John Doe',
    role: 'Senior Software Engineer',
    department: 'Employee',
    branch: 'Dubai Main',
    type: 'Full-time',
    status: 'Active',
    joiningDate: '2023-01-15',
    manager: 'Sarah Wilson',
    salary: '12000',
  },
  {
    id: 'EMP002',
    name: 'Jane Smith',
    role: 'HR Manager',
    department: 'HR',
    branch: 'Abu Dhabi',
    type: 'Full-time',
    status: 'Active',
    joiningDate: '2023-03-20',
    manager: 'Michael Brown',
    salary: '15000',
  },
  {
    id: 'EMP003',
    name: 'Robert Johnson',
    role: 'Sales Representative',
    department: 'Finance',
    branch: 'Dubai Silicon',
    type: 'Contract',
    status: 'Leave',
    joiningDate: '2023-06-10',
    manager: 'Jane Smith',
    salary: '8000',
  },
  {
    id: 'EMP004',
    name: 'Emily Davis',
    role: 'General Manager',
    department: 'Manager',
    branch: 'Dubai Main',
    type: 'Full-time',
    status: 'Active',
    joiningDate: '2023-08-05',
    manager: 'Sarah Wilson',
    salary: '25000',
  },
  {
    id: 'EMP005',
    name: 'Michael Chen',
    role: 'Finance Specialist',
    department: 'Finance',
    branch: 'Sharjah',
    type: 'Full-time',
    status: 'Resigned',
    joiningDate: '2023-02-01',
    manager: 'John Doe',
    salary: '9500',
  },
];

export default function EmployeeTable() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const filteredEmployees = mockEmployees.filter(
    (emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === 'All' || emp.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    }
  );

  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const handleEdit = (emp: any) => {
    setSelectedEmployee(emp);
    setIsFormOpen(true);
  };

  const handleDeleteTrigger = (emp: any) => {
    setSelectedEmployee(emp);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    if (selectedEmployee) {
      toast.success(`Employee ${data.name} updated successfully`);
    } else {
      toast.success(`Employee ${data.name} added successfully`);
    }
  };

  const handleDeleteConfirm = () => {
    toast.error(`Employee ${selectedEmployee.name} disabled`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border-0 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-blue-900">Employee List</h3>
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
                  Dept: {departmentFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => setDepartmentFilter('All')}>All Departments</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDepartmentFilter('Manager')}>Manager</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDepartmentFilter('HR')}>HR</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDepartmentFilter('Employee')}>Employee</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDepartmentFilter('Finance')}>Finance</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="rounded-xl border-gray-200">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">Employee ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">Department</th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">Branch</th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">Salary</th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider">Joining Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEmployees.map((emp, index) => (
              <tr key={emp.id} className={index % 2 === 1 ? 'bg-sky-100/60' : 'bg-white'}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{emp.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 truncate">{emp.name}</span>
                      <span className="text-xs text-gray-500">{emp.type}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[150px]">{emp.role}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.department}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.branch}</td>
                <td className="px-6 py-4 text-sm font-semibold text-blue-700">AED {emp.salary}</td>
                <td className="px-6 py-4">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] font-semibold border-none ${
                        emp.status === 'Active' ? 'bg-green-100 text-green-700' :
                        emp.status === 'Leave' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                    }`}
                  >
                    {emp.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.joiningDate}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => router.push(`/admin/human-resource/${emp.id}`)}
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
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleEdit(emp)}>
                          <UserCog className="h-4 w-4" /> Edit / Assign
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 focus:text-red-600" onClick={() => handleDeleteTrigger(emp)}>
                          <UserX className="h-4 w-4" /> Disable
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
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
        employeeName={selectedEmployee?.name || ''}
        onConfirm={handleDeleteConfirm}
      />
      
      <div className="p-6 border-t border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-500">Showing {filteredEmployees.length} of {mockEmployees.length} employees</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg h-8">Previous</Button>
          <Button variant="outline" size="sm" className="rounded-lg h-8 bg-primary text-white hover:bg-primary/90">1</Button>
          <Button variant="outline" size="sm" className="rounded-lg h-8">2</Button>
          <Button variant="outline" size="sm" className="rounded-lg h-8">Next</Button>
        </div>
      </div>
    </div>
  );
}
