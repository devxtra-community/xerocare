"use client";

import { useState } from "react";

import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { leaveRecords, LeaveStatus } from "@/lib/hr";

export default function LeaveApprovalPage() {
  const [leaves, setLeaves] = useState(leaveRecords);

  const updateStatus = (id: string, status: LeaveStatus) => {
    setLeaves(prev =>
      prev.map(l =>
        l.id === id ? { ...l, status } : l
      )
    );
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      <h1 className="text-xl font-semibold">Leave Approvals</h1>

      {/* STATS */}
        <h2 className="text-lg font-medium">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Pending" value={leaves.filter(l => l.status === "Pending").length.toString()} />
        <StatCard title="Approved" value={leaves.filter(l => l.status === "Approved").length.toString()} />
        <StatCard title="Rejected" value={leaves.filter(l => l.status === "Rejected").length.toString()} />
        <StatCard title="Total Requests" value={leaves.length.toString()} />
      </div>

      {/* TABLE */}
        <h2 className="text-lg font-medium">Leave Requests</h2>
      <div className="rounded-xl border bg-card overflow-x-auto">

        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 hidden md:table-cell">Department</th>
              <th className="p-3">Type</th>
              <th className="p-3 hidden lg:table-cell">Duration</th>
              <th className="p-3">Days</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {leaves.map(leave => (
              <tr key={leave.id} className="border-t">
                <td className="p-3">{leave.employeeName}</td>
                <td className="p-3 hidden md:table-cell">{leave.department}</td>
                <td className="p-3">{leave.type}</td>
                <td className="p-3 hidden lg:table-cell">
                  {leave.from} → {leave.to}
                </td>
                <td className="p-3">{leave.days}</td>
                <td className="p-3">
                  <StatusBadge status={leave.status} />
                </td>
                <td className="p-3 space-x-2">
                  {leave.status === "Pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(leave.id, "Approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(leave.id, "Rejected")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const styles = {
    Approved: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
