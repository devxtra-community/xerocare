'use client';
import { useState } from 'react';
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

export default function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    salary: '',
    expireDate: '',
  });
  const [files, setFiles] = useState<{ profile_image: File | null; id_proof: File | null }>({
    profile_image: null,
    id_proof: null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (formData.expireDate) {
        data.append('expireDate', formData.expireDate);
      }

      if (files.profile_image) data.append('profile_image', files.profile_image);
      if (files.id_proof) data.append('id_proof', files.id_proof);

      await createEmployee(data);
      setOpen(false);
      // Optional: trigger refresh of list here or require page reload
      window.location.reload();
    } catch (error) {
      console.error('Failed to create employee', error);
      alert('Failed to create employee');
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

      <DialogContent className="z-50 rounded-2xl bg-white text-foreground border border-border shadow-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Input
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleInputChange}
            />
            <Input
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleInputChange}
            />
          </div>

          <RoleSelect
            value={formData.role}
            onChange={(val: string) => setFormData((prev) => ({ ...prev, role: val }))}
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Contract Expiry</label>
              <Input
                type="date"
                name="expireDate"
                value={formData.expireDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Salary</label>
              <Input
                name="salary"
                placeholder="Salary"
                type="number"
                value={formData.salary}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
          />

          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Profile Image</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'profile_image')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">ID Proof</label>
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => handleFileChange(e, 'id_proof')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
