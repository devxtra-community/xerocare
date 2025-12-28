"use client";
import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const monthlyData = [
  { id: "EMP001", name: "Nathan Drake", dept: "Operations", present: 22, absent: 1, leave: 2, total: 25 },
  { id: "EMP002", name: "Elena Fisher", dept: "Marketing", present: 24, absent: 0, leave: 1, total: 25 },
  { id: "EMP003", name: "Victor Sullivan", dept: "Strategy", present: 20, absent: 3, leave: 2, total: 25 },
  { id: "EMP004", name: "Chloe Frazer", dept: "Engineering", present: 23, absent: 1, leave: 1, total: 25 },
  { id: "EMP005", name: "Samuel Drake", dept: "Operations", present: 21, absent: 2, leave: 2, total: 25 },
];

export default function MonthlyAttendanceTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = monthlyData.filter(emp => 
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
                <th className="text-center font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Present</th>
                <th className="text-center font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Absent</th>
                <th className="text-center font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Leave</th>
                <th className="text-right font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Total Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="py-4 px-6 text-gray-500 font-medium">#{emp.id}</td>
                  <td className="py-4 px-6 font-bold text-gray-900">{emp.name}</td>
                  <td className="py-4 px-6 text-gray-600">{emp.dept}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                      {emp.present}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      {emp.absent}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {emp.leave}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-gray-600 font-medium">{emp.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
