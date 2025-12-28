"use client";
import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const manualEntries = [
  { id: 1, employee: "Nathan Drake", empId: "EMP001", date: "2024-01-15", checkIn: "09:00 AM", checkOut: "06:00 PM", status: "Present", markedBy: "Admin", notes: "Forgot to check in" },
  { id: 2, employee: "Elena Fisher", empId: "EMP002", date: "2024-01-14", checkIn: "-", checkOut: "-", status: "On Leave", markedBy: "HR Manager", notes: "Medical leave" },
  { id: 3, employee: "Victor Sullivan", empId: "EMP003", date: "2024-01-13", checkIn: "09:00 AM", checkOut: "02:00 PM", status: "Half Day", markedBy: "Admin", notes: "Personal work" },
];

export default function ManualAttendanceTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = manualEntries.filter(entry => 
    entry.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.empId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-transparent p-0 mb-6">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-bold" />
            <Input 
              placeholder="Search entries" 
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
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Date</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Check In</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Check Out</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Status</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Marked By</th>
                <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((entry) => (
                <tr key={entry.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{entry.employee}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">#{entry.empId}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{entry.date}</td>
                  <td className="py-4 px-6 text-gray-600">{entry.checkIn}</td>
                  <td className="py-4 px-6 text-gray-600">{entry.checkOut}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      entry.status === 'Present' ? 'bg-green-100 text-green-700' : 
                      entry.status === 'On Leave' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-600 font-medium">{entry.markedBy}</td>
                  <td className="py-4 px-6 text-gray-500 text-xs">{entry.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
