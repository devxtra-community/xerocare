"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DepartmentTable from "@/components/hr/DepartmentTable";
import JobRolesTable from "@/components/hr/JobRolesTable";
import RolePermissionsMatrix from "@/components/hr/RolePermissionsMatrix";
import DeptAnalytics from "@/components/hr/DeptAnalytics";
import DepartmentDialog from "@/components/hr/DepartmentDialog";
import RoleDialog from "@/components/hr/RoleDialog";
import { Building2, Briefcase, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function DepartmentsPage() {
  const [activeTab, setActiveTab] = useState("departments");

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">
             Departments & Roles
          </h1>
          <p className="text-gray-500 font-medium">
             Manage and track department information
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === "departments" && <DepartmentDialog />}
          {activeTab === "roles" && <RoleDialog />}
        </div>
      </div>

      <Tabs defaultValue="departments" onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="bg-white border border-gray-100 p-1.5 rounded-3xl h-16 flex items-center justify-start gap-3 shadow-sm max-w-fit">
          <TabsTrigger value="departments" className="rounded-2xl h-12 px-8 data-[state=active]:bg-blue-900 data-[state=active]:text-white gap-2 font-black transition-all">
            <Building2 size={18} /> Departments
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-2xl h-12 px-8 data-[state=active]:bg-blue-900 data-[state=active]:text-white gap-2 font-black transition-all">
            <Briefcase size={18} /> Job Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="rounded-2xl h-12 px-8 data-[state=active]:bg-blue-900 data-[state=active]:text-white gap-2 font-black transition-all">
            <ShieldCheck size={18} /> Role Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-10 focus-visible:outline-none">
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operational Units</h3>
              </div>
              <DepartmentTable />
           </div>
           
           <div className="space-y-6">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Business Intelligence</h3>
              </div>
              <DeptAnalytics />
           </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-10 focus-visible:outline-none">
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Active Designations</h3>
              </div>
              <JobRolesTable />
           </div>

           <div className="space-y-6">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Workforce Distribution</h3>
              </div>
              <DeptAnalytics />
           </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-10 focus-visible:outline-none">
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Security Configuration</h3>
              </div>
              <RolePermissionsMatrix />
           </div>
        </TabsContent>
      </Tabs>

      {/* FOOTER */}
      <div className="pt-12 flex flex-col md:flex-row items-center justify-between border-t border-gray-100 gap-4 opacity-40">
         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">© 2023 Xerocare Architecture System</p>
      </div>
    </div>
  );
}
