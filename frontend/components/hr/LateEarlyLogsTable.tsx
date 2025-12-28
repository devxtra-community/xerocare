"use client";
import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const lateEarlyData = [
  { id: "EMP001", name: "Nathan Drake", dept: "Operations", date: "2024-01-15", scheduled: "09:00 AM", actual: "09:45 AM", type: "Late", minutes: 45 },
  { id: "EMP003", name: "Victor Sullivan", dept: "Strategy", date: "2024-01-15", scheduled: "06:00 PM", actual: "05:15 PM", type: "Early", minutes: 45 },
  { id: "EMP002", name: "Elena Fisher", dept: "Marketing", date: "2024-01-14", scheduled: "09:00 AM", actual: "09:30 AM", type: "Late", minutes: 30 },
  { id: "EMP005", name: "Samuel Drake", dept: "Operations", date: "2024-01-14", scheduled: "06:00 PM", actual: "04:30 PM", type: "Early", minutes: 90 },
  { id: "EMP001", name: "Nathan Drake", dept: "Operations", date: "2024-01-13", scheduled: "09:00 AM", actual: "10:00 AM", type: "Late", minutes: 60 },
];

export default function LateEarlyLogsTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = lateEarlyData.filter(log => 
    log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-transparent p-0 mb-6">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-bold" />
            <Input 
              placeholder="Search logs" 
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
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Employee</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Department</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Date</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Scheduled</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Actual</th>
                <th className="text-center font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Type</th>
                <th className="text-right font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((log, idx) => (
                <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{log.name}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">#{log.id}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{log.dept}</td>
                  <td className="py-4 px-6 text-gray-600">{log.date}</td>
                  <td className="py-4 px-6 text-gray-600">{log.scheduled}</td>
                  <td className="py-4 px-6 text-gray-600 font-medium">{log.actual}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      log.type === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="font-bold text-gray-900">{log.minutes} min</span>
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
