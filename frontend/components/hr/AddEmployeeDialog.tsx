"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
  DialogClose,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RoleSelect from "../RoleSelect";
import ConfirmDialog from "../ConfirmDialog";
import { useState } from "react";

type EmployeeForm = {
  name: string;
  role: string;
  joinDate: string;
  salary: string;
  email: string;
};

export default function AddEmployeeDialog() {
  const [form, setForm] = useState<EmployeeForm>({
    name: "",
    role: "",
    joinDate: "",
    salary: "",
    email: "",
  });

  const [errors, setErrors] = useState<Partial<EmployeeForm>>({});
  const [openConfirm, setOpenConfirm] = useState(false);

  /* ---------------- VALIDATION ---------------- */
  const validateForm = () => {
    const newErrors: Partial<EmployeeForm> = {};

    if (!form.name) newErrors.name = "Name is required";
    if (!form.role) newErrors.role = "Role is required";
    if (!form.joinDate) newErrors.joinDate = "Join date is required";
    if (!form.salary) newErrors.salary = "Salary is required";
    if (!form.email) newErrors.email = "Email is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  
  const handleConfirmClick = () => {
    if (!validateForm()) return;
    setOpenConfirm(true);
  };

  
  const handleCreateEmployee = () => {
    console.log("Create employee payload:", form);

   
    setOpenConfirm(false);
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="rounded-full">Add Employee</Button>
        </DialogTrigger>

        <DialogOverlay className="fixed inset-0 bg-background/70 backdrop-blur-md" />

        <DialogContent className="rounded-2xl bg-white border shadow-lg">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Full Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
            {errors.name && (
              <p className="text-xs text-accent">{errors.name}</p>
            )}

            <RoleSelect
              value={form.role}
              onChange={(role) => setForm({ ...form, role })}
            />
            {errors.role && (
              <p className="text-xs text-accent">{errors.role}</p>
            )}

            <Input
              type="date"
              value={form.joinDate}
              onChange={(e) =>
                setForm({ ...form, joinDate: e.target.value })
              }
            />
            {errors.joinDate && (
              <p className="text-xs text-accent">
                {errors.joinDate}
              </p>
            )}

            <Input
              placeholder="Salary"
              value={form.salary}
              onChange={(e) =>
                setForm({ ...form, salary: e.target.value })
              }
            />
            {errors.salary && (
              <p className="text-xs text-accent">{errors.salary}</p>
            )}

            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
            {errors.email && (
              <p className="text-xs text-accent">{errors.email}</p>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>

              {/* ONLY opens confirm */}
              <Button onClick={handleConfirmClick}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        onOpenChange={setOpenConfirm}
        title="Create employee?"
        description="Please confirm all details are correct."
        confirmText="Create"
        onConfirm={handleCreateEmployee}
      />
    </>
  );
}
