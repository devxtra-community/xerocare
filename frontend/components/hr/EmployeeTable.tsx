"use client";
import { useState } from "react";
import { Search, Filter, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EditEmployeePopUp from "./EditEmployeePopUp";
import DeleteEmployeePopUp from "./DeleteEmployeePopUp";

const initialEmployees = [
  {
    id: "EMP001",
    name: "Nathan Drake",
    role: "Adventure Lead",
    dept: "Operations",
    branch: "Main HQ",
    joiningDate: "2023-01-15",
    type: "Full-time",
    status: "Active",
    avatar: "ND"
  },
  {
    id: "EMP002",
    name: "Elena Fisher",
    role: "Senior Journalist",
    dept: "Marketing",
    branch: "East Wing",
    joiningDate: "2023-02-20",
    type: "Contract",
    status: "Active",
    avatar: "EF"
  },
  {
    id: "EMP003",
    name: "Victor Sullivan",
    role: "Advisor",
    dept: "Strategy",
    branch: "North Base",
    joiningDate: "2023-03-10",
    type: "Full-time",
    status: "On Leave",
    avatar: "VS"
  },
  {
    id: "EMP004",
    name: "Chloe Frazer",
    role: "Lead Designer",
    dept: "Engineering",
    branch: "South Hub",
    joiningDate: "2023-05-05",
    type: "Full-time",
    status: "Active",
    avatar: "CF"
  },
  {
    id: "EMP005",
    name: "Samuel Drake",
    role: "Junior Associate",
    dept: "Operations",
    branch: "Main HQ",
    joiningDate: "2023-06-12",
    type: "Intern",
    status: "Active",
    avatar: "SD"
  },
];

export default function EmployeeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState(initialEmployees);
  
  // State for popups
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<any>(null);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.dept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = () => {
    if (deletingEmployee) {
      setEmployees(employees.filter(e => e.id !== deletingEmployee.id));
      setDeletingEmployee(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* SEARCH AND FILTER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-transparent p-0 mb-6">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-bold" />
            <Input 
              placeholder="Search employee" 
              className="pl-10 h-10 rounded-lg border-gray-200 bg-white focus-visible:ring-blue-600 focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-lg gap-2 h-10 border-transparent bg-blue-50/50 text-blue-900 font-bold hover:bg-blue-100 px-4">
            <Filter size={16} className="rotate-0" /> Sort
          </Button>
          <Button variant="outline" className="rounded-lg gap-2 h-10 border-transparent bg-blue-50/50 text-blue-900 font-bold hover:bg-blue-100 px-4">
            <Filter size={16} /> Filter
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-blue-900 border-b border-gray-100">
                <th className="text-left font-bold py-4 px-6 min-w-[200px] uppercase tracking-wider text-[11px]">Employee</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">ID</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Role / Dept</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Branch</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Joining Date</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Type</th>
                <th className="text-right font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                         {emp.avatar}
                      </div>
                      <span className="font-bold text-gray-900">{emp.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-500 font-medium">#{emp.id}</td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">{emp.role}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{emp.dept}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600 font-medium">{emp.branch}</td>
                  <td className="py-4 px-6 text-gray-600">{emp.joiningDate}</td>
                  <td className="py-4 px-6 text-gray-600">{emp.type}</td>
                  <td className="py-4 px-6 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      emp.status === 'Active' ? 'bg-green-100 text-green-700' : 
                      emp.status === 'On Leave' ? 'bg-amber-100 text-amber-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-blue-600">
                           <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl ring-1 ring-black/5">
                        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-gray-400">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEditingEmployee(emp)} className="gap-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer py-2">
                           <Edit size={14} /> Update Info
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingEmployee(emp)} className="gap-2 focus:bg-red-50 focus:text-red-700 cursor-pointer text-red-600 py-2">
                           <Trash2 size={14} /> Delete Employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUPS */}
      <EditEmployeePopUp 
        open={!!editingEmployee} 
        onClose={() => setEditingEmployee(null)} 
        employee={editingEmployee} 
      />
      
      <DeleteEmployeePopUp 
        open={!!deletingEmployee} 
        onClose={() => setDeletingEmployee(null)} 
        onConfirm={handleDelete}
        employeeName={deletingEmployee?.name ?? ""}
      />
    </div>
  );
}
