"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RoleSelect from "./RoleSelect"

export default function AddEmployeeDialog() {
    return (
        <Dialog>
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
          <div>
            <input
              type="file"
              accept=".csv,.xlsx"
              id="employee-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label htmlFor="employee-upload">
              <Button variant="outline" type="button">
                Upload CSV / Excel
              </Button>
            </label>

            {file && (
              <p className="mt-1 text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button onClick={handleSubmit}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
