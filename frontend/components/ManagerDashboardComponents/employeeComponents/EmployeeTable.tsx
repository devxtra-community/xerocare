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
import { Search, Mail, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

const mockEmployees = [
  { id: 1, name: 'Arjun Mehta', email: 'arjun@xerocare.com', department: 'Sales', status: 'Active', joiningDate: '2023-01-15', visaExpire: '2025-06-12' },
  { id: 2, name: 'Suhail Khan', email: 'suhail@xerocare.com', department: 'Service', status: 'On Leave', joiningDate: '2022-11-01', visaExpire: '2024-12-30' },
  { id: 3, name: 'Priya Sharma', email: 'priya@xerocare.com', department: 'Inventory', status: 'Active', joiningDate: '2023-03-10', visaExpire: '2026-01-15' },
  { id: 4, name: 'Aditya Rao', email: 'aditya@xerocare.com', department: 'Finance', status: 'Active', joiningDate: '2021-09-05', visaExpire: '2025-09-05' },
  { id: 5, name: 'Zoya Ahmed', email: 'zoya@xerocare.com', department: 'Sales', status: 'Active', joiningDate: '2023-05-20', visaExpire: '2024-10-18' },
  { id: 6, name: 'Rahul Varma', email: 'rahul@xerocare.com', department: 'Service', status: 'Active', joiningDate: '2022-02-14', visaExpire: '2025-02-14' },
];

export default function EmployeeTable() {
  const router = useRouter();
  const [employees, setEmployees] = useState(mockEmployees);
  const [search, setSearch] = useState('');

  const toggleStatus = (id: number, newStatus: string) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === id ? { ...emp, status: newStatus } : emp
    ));
  };
  
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    emp.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search employees..."
            className="pl-10 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm rounded-xl transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-slate-50/20">
              <TableRow className="border-b border-blue-50/50 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold text-blue-900 uppercase py-3 px-4">Employee Details</TableHead>
                <TableHead className="text-[10px] font-bold text-blue-900 uppercase">Department</TableHead>
                <TableHead className="text-[10px] font-bold text-blue-900 uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-bold text-blue-900 uppercase">Joining Date</TableHead>
                <TableHead className="text-[10px] font-bold text-blue-900 uppercase text-center">Visa Expire</TableHead>
                <TableHead className="text-right text-[10px] font-bold text-blue-900 uppercase pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp, index) => (
                <TableRow key={emp.id} className={`hover:bg-slate-50/30 transition-colors border-b border-blue-50/20 ${index % 2 ? 'bg-sky-50/20' : ''}`}>
                  <TableCell className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-gray-900 leading-tight">{emp.name}</span>
                        <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
                          <Mail className="h-2 w-2" /> {emp.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase
                      ${emp.department === 'Sales' ? 'bg-blue-100 text-blue-700' : 
                        emp.department === 'Service' ? 'bg-purple-100 text-purple-700' :
                        emp.department === 'Inventory' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'}`}>
                      {emp.department}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold
                      ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      <span className={`h-1 w-1 rounded-full ${emp.status === 'Active' ? 'bg-green-600' : 'bg-orange-600'}`} />
                      {emp.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] font-medium text-gray-600 py-2">{emp.joiningDate}</TableCell>
                  <TableCell className="text-[11px] font-semibold text-red-600/80 text-center py-2">{emp.visaExpire}</TableCell>
                  <TableCell className="text-right py-2 pr-4">
                    <div className="flex justify-end items-center gap-1">
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => router.push(`/manager/employees/${emp.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-0.5 ml-1">
                        <Button
                          variant={emp.status === 'Active' ? 'default' : 'ghost'}
                          size="sm"
                          className={`h-6 px-1.5 text-[8px] font-bold transition-all duration-200 ${
                            emp.status === 'Active' 
                              ? 'bg-green-600 hover:bg-green-700 text-white shadow-xs' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          onClick={() => toggleStatus(emp.id, 'Active')}
                        >
                          ENABLE
                        </Button>
                        <Button
                          variant={emp.status !== 'Active' ? 'destructive' : 'ghost'}
                          size="sm"
                          className={`h-6 px-1.5 text-[8px] font-bold transition-all duration-200 ${
                            emp.status !== 'Active' 
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          onClick={() => toggleStatus(emp.id, 'Disabled')}
                        >
                          DISABLE
                        </Button>
                      </div>
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
