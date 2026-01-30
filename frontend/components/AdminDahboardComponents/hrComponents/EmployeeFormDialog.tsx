'use client';

import Image from 'next/image';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePlus, FileText, X } from 'lucide-react';
import { Employee } from '@/lib/employee';
import { getBranches, Branch } from '@/lib/branch';
import { getEmployeeJobOptions, EmployeeJob } from '@/lib/employeeJob';
import { getFinanceJobOptions, FinanceJob } from '@/lib/financeJob';
import { getUserFromToken } from '@/lib/auth';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Employee | null;
  onSubmit: (formData: FormData) => Promise<boolean>;
}

export default function EmployeeFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'EMPLOYEE',
    employee_job: '' as EmployeeJob | '',
    finance_job: '' as FinanceJob | '',
    salary: '',
    expire_date: '',
    status: 'ACTIVE',
    branchId: '',
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [idProof, setIdProof] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentUserBranch, setCurrentUserBranch] = useState<Branch | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const idProofInputRef = useRef<HTMLInputElement>(null);

  // Get current user info
  const currentUser = getUserFromToken();
  const isAdmin = currentUser?.role === 'ADMIN';
  const userBranchId = currentUser?.branchId;

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await getBranches();
        let branchList: Branch[] = [];
        if (response && response.success && Array.isArray(response.data)) {
          branchList = response.data;
          setBranches(response.data);
        } else if (Array.isArray(response)) {
          branchList = response;
          setBranches(response);
        }

        // Find and set current user's branch
        if (userBranchId && branchList.length > 0) {
          const userBranch = branchList.find((b) => (b.id || b.branch_id) === userBranchId);
          if (userBranch) {
            setCurrentUserBranch(userBranch);
          }
        }
      } catch (error) {
        console.error('Failed to fetch branches:', error);
      }
    };
    fetchBranches();
  }, [userBranchId]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        email: initialData.email || '',
        role: initialData.role || 'EMPLOYEE',
        employee_job: (initialData as Employee & { employee_job?: EmployeeJob }).employee_job || '',
        finance_job: (initialData as Employee & { finance_job?: FinanceJob }).finance_job || '',
        salary: initialData.salary?.toString() || '',
        expire_date: initialData.expire_date
          ? new Date(initialData.expire_date).toISOString().split('T')[0]
          : '',
        status: initialData.status || 'ACTIVE',
        branchId: initialData.branch_id || '',
      });
      setProfilePreview(initialData.profile_image_url);
    } else {
      // For new employees, auto-fill branchId with HR's branch
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        role: 'EMPLOYEE',
        employee_job: '',
        finance_job: '',
        salary: '',
        expire_date: '',
        status: 'ACTIVE',
        branchId: !isAdmin && userBranchId ? userBranchId : '',
      });
      setProfilePreview(null);
      setProfileImage(null);
      setIdProof(null);
    }
  }, [initialData, open, isAdmin, userBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'profile' | 'id_proof',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'profile') {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setIdProof(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('email', formData.email);
      data.append('role', formData.role);
      if (formData.employee_job) {
        data.append('employee_job', formData.employee_job);
      }
      if (formData.finance_job) {
        data.append('finance_job', formData.finance_job);
      }
      data.append('salary', formData.salary);
      if (formData.expire_date) {
        data.append('expireDate', formData.expire_date);
      }
      if (formData.branchId) {
        data.append('branchId', formData.branchId);
      }
      data.append('status', formData.status);

      if (profileImage) {
        data.append('profile_image', profileImage);
      }
      if (idProof) {
        data.append('id_proof', idProof);
      }

      const success = await onSubmit(data);
      if (success) {
        onOpenChange(false);
      }
    } catch {
      // Error is handled in the onSubmit parent function
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary text-center">
            {initialData ? 'Update Employee' : 'Add New Employee'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative h-24 w-24 rounded-full bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center cursor-pointer overflow-hidden group"
              onClick={() => profileInputRef.current?.click()}
            >
              {profilePreview ? (
                <Image src={profilePreview} alt="Profile preview" fill className="object-cover" />
              ) : (
                <ImagePlus className="h-8 w-8 text-blue-400 group-hover:text-blue-500 transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[10px] text-white font-bold">CHANGE</span>
              </div>
            </div>
            <input
              type="file"
              ref={profileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'profile')}
            />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Profile Picture
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                First Name
              </label>
              <Input
                name="first_name"
                placeholder="John"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Last Name
              </label>
              <Input
                name="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="john.doe@xerocare.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={!!initialData}
                className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Role / Designation
              </label>
              <Select
                value={formData.role}
                onValueChange={(val) => handleSelectChange('role', val)}
              >
                <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="FINANCE">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee Job - Only show for EMPLOYEE role */}
            {formData.role === 'EMPLOYEE' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Employee Job / Responsibility *
                </label>
                <Select
                  value={formData.employee_job}
                  onValueChange={(val) => handleSelectChange('employee_job', val)}
                  required={formData.role === 'EMPLOYEE'}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {getEmployeeJobOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Finance Job - Only show for FINANCE role */}
            {formData.role === 'FINANCE' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Finance Job / Responsibility *
                </label>
                <Select
                  value={formData.finance_job}
                  onValueChange={(val) => handleSelectChange('finance_job', val)}
                  required={formData.role === 'FINANCE'}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select finance job type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {getFinanceJobOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Salary (AED)
              </label>
              <Input
                name="salary"
                type="number"
                placeholder="5000"
                value={formData.salary}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Contract Expire Date
              </label>
              <Input
                name="expire_date"
                type="date"
                value={formData.expire_date}
                onChange={handleChange}
                className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Employee Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(val) => handleSelectChange('status', val)}
              >
                <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ACTIVE" className="text-green-600 font-medium">
                    Active
                  </SelectItem>
                  <SelectItem value="INACTIVE" className="text-amber-600 font-medium">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Assigned Branch
              </label>
              {isAdmin ? (
                <Select
                  value={formData.branchId}
                  onValueChange={(val) => handleSelectChange('branchId', val)}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {branches.map((branch) => (
                      <SelectItem
                        key={branch.id || branch.branch_id}
                        value={branch.id || branch.branch_id || ''}
                      >
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-12 rounded-xl bg-gray-100 border-none shadow-sm flex items-center px-4 text-gray-700 font-medium">
                  {currentUserBranch?.name || 'Loading...'}
                </div>
              )}
            </div>
          </div>

          {/* ID Proof Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              ID Proof Document (Passport/Emirates ID)
            </label>
            <div
              className={`h-20 rounded-xl border-2 border-dashed flex items-center justify-between px-6 cursor-pointer transition-colors ${
                idProof
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-200'
              }`}
              onClick={() => idProofInputRef.current?.click()}
            >
              <div className="flex items-center gap-3">
                <FileText className={`h-5 w-5 ${idProof ? 'text-green-500' : 'text-gray-400'}`} />
                <span
                  className={`text-sm ${idProof ? 'text-green-700 font-medium' : 'text-gray-500'}`}
                >
                  {idProof ? idProof.name : 'Click to upload ID proof'}
                </span>
              </div>
              {idProof && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdProof(null);
                  }}
                  className="p-1 hover:bg-green-100 rounded-full text-green-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              type="file"
              ref={idProofInputRef}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, 'id_proof')}
            />
          </div>

          <div className="flex justify-end items-center gap-6 pt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-10 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-lg disabled:opacity-70"
            >
              {isSubmitting ? 'Processing...' : initialData ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
