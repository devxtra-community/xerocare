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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import AddLeaveDialog, { LeaveData } from './AddLeaveDialog';
import UpdateLeaveDialog from './UpdateLeaveDialog';

type Leave = LeaveData & { id: string };

const MOCK_LEAVES: Leave[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: 'John Doe',
    email: 'john@example.com',
    branch: 'Cochin branch',
    startDate: '2024-01-20',
    endDate: '2024-01-22',
    reason: 'Personal leave for family event.',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: 'Jane Smith',
    email: 'jane@example.com',
    branch: 'Cochin branch',
    startDate: '2024-02-10',
    endDate: '2024-02-15',
    reason: 'Vacation.',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    branch: 'Cochin branch',
    startDate: '2024-03-01',
    endDate: '2024-03-01',
    reason: 'Sick leave.',
  },
];

export default function HRLeaveTable() {
  const [leaves, setLeaves] = useState<Leave[]>(MOCK_LEAVES);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

  const filteredLeaves = leaves.filter(
    (leave) =>
      leave.name.toLowerCase().includes(search.toLowerCase()) ||
      leave.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      leave.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddLeave = (data: LeaveData) => {
    const newLeave: Leave = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
    };
    setLeaves((prev) => [newLeave, ...prev]);
  };

  const handleUpdateLeave = (id: string, data: Partial<LeaveData>) => {
    setLeaves((prev) => prev.map((leave) => (leave.id === id ? { ...leave, ...data } : leave)));
  };

  const handleEditClick = (leave: Leave) => {
    setSelectedLeave(leave);
    setIsUpdateOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this leave record?')) {
      setLeaves(leaves.filter((l) => l.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-50 border-none shadow-sm"
          />
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 font-bold">
          <Plus className="h-4 w-4" /> Add Leave
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Employee ID
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Name
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Email
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Branch
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Start Date
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                End Date
              </TableHead>
              <TableHead className="px-3 py-2 font-bold text-xs uppercase tracking-wider text-primary">
                Reason
              </TableHead>
              <TableHead className="px-3 py-2 text-right font-bold text-xs uppercase tracking-wider text-primary">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeaves.length > 0 ? (
              filteredLeaves.map((leave) => (
                <TableRow key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="px-3 py-1.5 font-medium text-primary">
                    {leave.employeeId}
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <div className="font-medium text-primary">{leave.name}</div>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-muted-foreground">{leave.email}</TableCell>
                  <TableCell className="px-3 py-1.5">{leave.branch}</TableCell>
                  <TableCell className="px-3 py-1.5">{leave.startDate}</TableCell>
                  <TableCell className="px-3 py-1.5">{leave.endDate}</TableCell>
                  <TableCell className="px-3 py-1.5 max-w-[200px] truncate" title={leave.reason}>
                    {leave.reason}
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleEditClick(leave)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(leave.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No leave records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddLeaveDialog open={isAddOpen} onOpenChange={setIsAddOpen} onSubmit={handleAddLeave} />

      <UpdateLeaveDialog
        open={isUpdateOpen}
        onOpenChange={setIsUpdateOpen}
        leave={selectedLeave}
        onSubmit={handleUpdateLeave}
      />
    </div>
  );
}
