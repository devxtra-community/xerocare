"use client";
import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const attendanceData = [
  { id: "EMP001", name: "Nathan Drake", dept: "Operations", checkIn: "09:00 AM", checkOut: "06:00 PM", status: "Present", hours: "9h" },
  { id: "EMP002", name: "Elena Fisher", dept: "Marketing", checkIn: "09:15 AM", checkOut: "06:15 PM", status: "Present", hours: "9h" },
  { id: "EMP003", name: "Victor Sullivan", dept: "Strategy", checkIn: "10:30 AM", checkOut: "06:00 PM", status: "Late", hours: "7.5h" },
  { id: "EMP004", name: "Chloe Frazer", dept: "Engineering", checkIn: "-", checkOut: "-", status: "Absent", hours: "0h" },
  { id: "EMP005", name: "Samuel Drake", dept: "Operations", checkIn: "09:00 AM", checkOut: "04:00 PM", status: "Early Leave", hours: "7h" },
];

export default function DailyAttendanceTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = attendanceData.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-blue-900 border-b border-gray-100">
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Employee ID</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Name</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Department</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Check In</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Check Out</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Hours</th>
                <th className="text-right font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="py-4 px-6 text-gray-500 font-medium">#{emp.id}</td>
                  <td className="py-4 px-6 font-bold text-gray-900">{emp.name}</td>
                  <td className="py-4 px-6 text-gray-600">{emp.dept}</td>
                  <td className="py-4 px-6 text-gray-600">{emp.checkIn}</td>
                  <td className="py-4 px-6 text-gray-600">{emp.checkOut}</td>
                  <td className="py-4 px-6 text-gray-600">{emp.hours}</td>
                  <td className="py-4 px-6 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      emp.status === 'Present' ? 'bg-green-100 text-green-700' : 
                      emp.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                      emp.status === 'Early Leave' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
