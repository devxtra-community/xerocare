"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Edit, AlertCircle } from "lucide-react";
import { useState } from "react";
import DailyAttendanceTable from "@/components/hr/DailyAttendanceTable";
import DailyAttendanceChart from "@/components/hr/DailyAttendanceChart";
import MonthlyAttendanceTable from "@/components/hr/MonthlyAttendanceTable";
import MonthlyAttendanceChart from "@/components/hr/MonthlyAttendanceChart";
import ManualAttendanceDialog from "@/components/hr/ManualAttendanceDialog";
import ManualAttendanceTable from "@/components/hr/ManualAttendanceTable";
import LateEarlyLogsTable from "@/components/hr/LateEarlyLogsTable";
import LateEarlyChart from "@/components/hr/LateEarlyChart";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("daily");

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">
             Attendance Management
          </h1>
          <p className="text-gray-500 font-medium">
             Track and manage employee attendance records
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === "manual" && <ManualAttendanceDialog />}
        </div>
      </div>

      <Tabs defaultValue="daily" onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="bg-white border border-gray-100 p-1.5 rounded-3xl h-16 flex items-center justify-start gap-3 shadow-sm max-w-fit">
          <TabsTrigger value="daily" className="rounded-2xl h-12 px-8 data-[state=active]:bg-blue-900 data-[state=active]:text-white gap-2 font-black transition-all">
            <Clock size={18} /> Daily
          </TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-2xl h-12 px-8 data-[state=active]:bg-blue-900 data-[state=active]:text-white gap-2 font-black transition-all">
            <Calendar size={18} /> Monthly
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-2xl h-12 px-8 data-[state=active]:bg-blue-900 data-[state=active]:text-white gap-2 font-black transition-all">
            <Edit size={18} /> Manual Entry
          </TabsTrigger>
          <TabsTrigger value="late-early" className="rounded-2xl h-12 px-8 data-[state=active]:bg-blue-900 data-[state=active]:text-white gap-2 font-black transition-all">
            <AlertCircle size={18} /> Late/Early Logs
          </TabsTrigger>
        </TabsList>

        {/* DAILY ATTENDANCE TAB */}
        <TabsContent value="daily" className="space-y-10 focus-visible:outline-none">
           {/* TABLE SECTION */}
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Today's Attendance Records</h3>
              </div>
              <DailyAttendanceTable />
           </div>
           
           {/* ANALYTICS SECTION */}
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Analytics Overview</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DailyAttendanceChart />
                <MonthlyAttendanceChart />
              </div>
           </div>
        </TabsContent>

        {/* MONTHLY ATTENDANCE TAB */}
        <TabsContent value="monthly" className="space-y-10 focus-visible:outline-none">
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Monthly Summary</h3>
              </div>
              <MonthlyAttendanceTable />
           </div>
        </TabsContent>

        {/* MANUAL ATTENDANCE TAB */}
        <TabsContent value="manual" className="space-y-10 focus-visible:outline-none">
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manual Entry History</h3>
              </div>
              <ManualAttendanceTable />
           </div>
        </TabsContent>

        {/* LATE/EARLY LOGS TAB */}
        <TabsContent value="late-early" className="space-y-10 focus-visible:outline-none">
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Late Arrival & Early Departure Records</h3>
              </div>
              <LateEarlyLogsTable />
           </div>
           
           <div className="space-y-4">
              <div className="px-2">
                 <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Punctuality Analysis</h3>
              </div>
              <LateEarlyChart />
           </div>
        </TabsContent>
      </Tabs>

      {/* FOOTER */}
      <div className="pt-12 flex flex-col md:flex-row items-center justify-between border-t border-gray-100 gap-4 opacity-40">
         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">© 2023 Xerocare Attendance System</p>
      </div>
    </div>
  );
}
