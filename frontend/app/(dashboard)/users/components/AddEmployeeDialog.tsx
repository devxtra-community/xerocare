"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RoleSelect from "./RoleSelect";
import { useState } from "react";

export default function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    role: "",
    joinDate: "",
    salary: "",
    email: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit() {
    if (!form.name || !form.role || !form.email) {
      alert("Please fill all required fields");
      return;
    }

    // TEMP — later replace with API call
    console.log("New Employee:", form);

    setForm({
      name: "",
      role: "",
      joinDate: "",
      salary: "",
      email: "",
    });
    setOpen(false);
  }

  function handleCancel() {
    setForm({
      name: "",
      role: "",
      joinDate: "",
      salary: "",
      email: "",
    });
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">Add Employee</Button>
      </DialogTrigger>

      <DialogOverlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md" />

      <DialogContent className="z-50 rounded-2xl w-[95vw] max-w-lg p-6 bg-white text-foreground border border-border shadow-lg">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="sm:col-span-2"
          />
          <RoleSelect
            value={form.role}
            onChange={(role) => setForm({ ...form, role })}
          />
          <Input
            name="joinDate"
            type="date"
            value={form.joinDate}
            onChange={handleChange}
            placeholder="Join Date"
          />
          <Input
            name="salary"
            placeholder="Salary"
            value={form.salary}
            onChange={handleChange}
          />
          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="sm:col-span-2"
          />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
