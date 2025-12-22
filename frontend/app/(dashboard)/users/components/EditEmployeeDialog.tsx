"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldContent,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type EmployeeDTO = {
  id: string;
  name: string;
  department: string;
  designation: string;
  outlet: string;
  phone: string;
  email: string;
};

export default function EditEmployeeDialog({
  open,
  onClose,
  employee,
}: {
  open: boolean;
  onClose: () => void;
  employee: EmployeeDTO;
}) {
  const [form, setForm] = useState<EmployeeDTO>(employee);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        {/* FORM */}
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <FieldContent>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Department</FieldLabel>
            <FieldContent>
              <Input
                name="department"
                value={form.department}
                onChange={handleChange}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Designation</FieldLabel>
            <FieldContent>
              <Input
                name="designation"
                value={form.designation}
                onChange={handleChange}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Outlet</FieldLabel>
            <FieldContent>
              <Input
                name="outlet"
                value={form.outlet}
                onChange={handleChange}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Phone</FieldLabel>
            <FieldContent>
              <Input
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Email</FieldLabel>
            <FieldContent>
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </FieldContent>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
