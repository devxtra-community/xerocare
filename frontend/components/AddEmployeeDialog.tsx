'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RoleSelect from './RoleSelect';
import { createEmployee } from '@/lib/employee';
import { getBranches, Branch } from '@/lib/branch';
import { toast } from 'sonner';

export default function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    salary: '',
    expireDate: '',
    branchId: '',
  });
  const [files, setFiles] = useState<{ profile_image: File | null; id_proof: File | null }>({
    profile_image: null,
    id_proof: null,
  });

  useEffect(() => {
    if (open) {
      getBranches()
        .then((data) => setBranches(data))
        .catch((err) => console.error('Failed to fetch branches', err));
    }
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'profile_image' | 'id_proof',
  ) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('email', formData.email);
      data.append('role', formData.role);
      data.append('salary', formData.salary);
      if (formData.branchId) {
        data.append('branchId', formData.branchId);
      }
      if (formData.expireDate) {
        data.append('expireDate', formData.expireDate);
      }

      if (files.profile_image) data.append('profile_image', files.profile_image);
      if (files.id_proof) data.append('id_proof', files.id_proof);

      await createEmployee(data);
      toast.success('Employee created successfully');
      setOpen(false);
      // Optional: trigger refresh of list here or require page reload
      window.location.reload();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">Add Employee</Button>
      </DialogTrigger>

      <DialogOverlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md" />

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">Add New Employee</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                First Name
              </label>
              <Input
                name="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={handleInputChange}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Last Name
              </label>
              <Input
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleInputChange}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Role
              </label>
              <RoleSelect
                value={formData.role}
                onChange={(val: string) => setFormData((prev) => ({ ...prev, role: val }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Contract Expiry
              </label>
              <Input
                type="date"
                name="expireDate"
                value={formData.expireDate}
                onChange={handleInputChange}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Salary
              </label>
              <Input
                name="salary"
                placeholder="Salary"
                type="number"
                value={formData.salary}
                onChange={handleInputChange}
                className="h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Branch
              </label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleInputChange}
                className="w-full h-12 px-3 rounded-xl bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 text-sm"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Profile Image
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'profile_image')}
                className="h-12 rounded-xl bg-white border-none shadow-sm text-xs file:bg-blue-50 file:text-blue-600 file:border-none file:rounded-lg file:px-2 file:py-1 file:mr-2 flex items-center"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                ID Proof
              </label>
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => handleFileChange(e, 'id_proof')}
                className="h-12 rounded-xl bg-white border-none shadow-sm text-xs file:bg-blue-50 file:text-blue-600 file:border-none file:rounded-lg file:px-2 file:py-1 file:mr-2 flex items-center"
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-6 pt-8">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="h-12 px-10 rounded-xl bg-[#004a8d] text-white hover:bg-[#003f7d] font-bold shadow-lg"
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
