"use client";
import { useState } from "react";
import { Search, Filter, Briefcase, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EditRolePopUp from "./EditRolePopUp";
import DeleteRolePopUp from "./DeleteRolePopUp";

const initialRoles = [
  { id: "ROLE01", title: "Sales Executive", dept: "Sales", employees: 12, level: "L2" },
  { id: "ROLE02", title: "HR Manager", dept: "Human Resources", employees: 2, level: "L5" },
  { id: "ROLE03", title: "Financial Analyst", dept: "Finance", employees: 4, level: "L3" },
  { id: "ROLE04", title: "Service Technician", dept: "Service", employees: 20, level: "L2" },
  { id: "ROLE05", title: "Warehouse Supervisor", dept: "Warehouse", employees: 5, level: "L4" },
  { id: "ROLE06", title: "Sales Manager", dept: "Sales", employees: 3, level: "L5" },
];

export default function JobRolesTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roles, setRoles] = useState(initialRoles);
  
  const [editingRole, setEditingRole] = useState<any>(null);
  const [deletingRole, setDeletingRole] = useState<any>(null);

  const filteredRoles = roles.filter(role => 
     role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     role.dept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-transparent p-0 mb-6">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-bold" />
            <Input 
              placeholder="Search roles or depts..." 
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 text-blue-900 border-b border-gray-100">
              <th className="text-left font-bold py-4 px-8 uppercase tracking-wider text-[11px]">Role Title</th>
              <th className="text-left font-bold py-4 px-8 uppercase tracking-wider text-[11px]">Department</th>
              <th className="text-left font-bold py-4 px-8 uppercase tracking-wider text-[11px]">Level</th>
              <th className="text-left font-bold py-4 px-8 uppercase tracking-wider text-[11px]">Headcount</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRoles.map((role) => (
              <tr key={role.id} className="hover:bg-blue-50/20 transition-colors group">
                <td className="py-5 px-8">
                   <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                         <Briefcase size={18} />
                      </div>
                      <span className="font-bold text-gray-900 text-base">{role.title}</span>
                   </div>
                </td>
                <td className="py-5 px-8">
                   <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                      {role.dept}
                   </span>
                </td>
                <td className="py-5 px-8 font-black text-blue-900">{role.level}</td>
                <td className="py-5 px-8 text-gray-500 font-medium">{role.employees} Employees</td>
                <td className="py-5 px-6">
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-blue-600">
                            <MoreHorizontal size={18} />
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl ring-1 ring-black/5">
                         <DropdownMenuItem onClick={() => setEditingRole(role)} className="gap-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer py-2">
                            <Edit size={14} /> Edit Role
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setDeletingRole(role)} className="gap-2 focus:bg-red-50 focus:text-red-700 cursor-pointer text-red-600 py-2">
                            <Trash2 size={14} /> Remove Role
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                   </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditRolePopUp open={!!editingRole} onClose={() => setEditingRole(null)} role={editingRole} />
      <DeleteRolePopUp open={!!deletingRole} onClose={() => setDeletingRole(null)} onConfirm={() => {
         setRoles(roles.filter(r => r.id !== deletingRole.id));
         setDeletingRole(null);
      }} roleName={deletingRole?.title ?? ""} />
    </div>
  );
}
