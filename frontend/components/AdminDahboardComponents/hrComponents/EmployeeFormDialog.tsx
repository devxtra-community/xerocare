'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  onSubmit: (data: any) => void;
}

export default function EmployeeFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: '',
    branch: '',
    type: 'Full-time',
    status: 'Active',
    joiningDate: '',
    manager: '',
    salary: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        role: '',
        department: '',
        branch: '',
        type: 'Full-time',
        status: 'Active',
        joiningDate: new Date().toISOString().split('T')[0],
        manager: '',
        salary: '',
      });
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-900">
            {initialData ? 'Update Employee' : 'Add New Employee'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
              <Input
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role / Designation</label>
              <Input
                name="role"
                placeholder="Software Engineer"
                value={formData.role}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Department</label>
              <Select value={formData.department} onValueChange={(val) => handleSelectChange('department', val)}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branch / Location</label>
              <Input
                name="branch"
                placeholder="Dubai Main"
                value={formData.branch}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Employment Type</label>
              <Select value={formData.type} onValueChange={(val) => handleSelectChange('type', val)}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
              <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joining Date</label>
              <Input
                name="joiningDate"
                type="date"
                value={formData.joiningDate}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reporting Manager</label>
              <Input
                name="manager"
                placeholder="Manager Name"
                value={formData.manager}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Salary (AED)</label>
              <Input
                name="salary"
                type="number"
                placeholder="5000"
                value={formData.salary}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-6 pt-8">
            <button 
              type="button" 
              onClick={() => onOpenChange(false)} 
              className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <Button 
              type="submit" 
              className="h-12 px-10 rounded-xl bg-[#004a8d] text-white hover:bg-[#003f7d] font-bold shadow-lg"
            >
              {initialData ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
