"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatCard from "@/components/StatCard";

type Branch = {
  id: string;
  branchName: string;
  address: string;
  location: string;
  startedDate: string;
  status: "active" | "inactive";
  manager: string;
};

const initialBranches: Branch[] = [
  {
    id: "1",
    branchName: "CityWave Store",
    address: "MG Road, Ernakulam",
    location: "Ernakulam",
    startedDate: "2023-11-20",
    status: "active",
    manager: "Rajesh Kumar",
  },
  {
    id: "2",
    branchName: "UrbanHub Outlet",
    address: "Vyttila Junction",
    location: "Kochi",
    startedDate: "2023-02-10",
    status: "active",
    manager: "Priya Menon",
  },
  {
    id: "3",
    branchName: "PrimePoint Store",
    address: "Pattom",
    location: "Trivandrum",
    startedDate: "2024-05-18",
    status: "inactive",
    manager: "Unassigned",
  },
];

const availableManagers = [
  "Unassigned",
  "Rajesh Kumar",
  "Priya Menon",
  "Arjun Nair",
  "Lakshmi Pillai",
  "Vijay Krishnan",
  "Sreelatha Menon",
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export default function BranchReport() {
  const [branches, setBranches] = useState(initialBranches);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);

  const filtered = branches.filter((b) =>
    `${b.branchName} ${b.address} ${b.location}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

                                                                                                                                                        
  const totalBranches = branches.length;
  const activeBranches = branches.filter(b => b.status === "active").length;
  const inactiveBranches = branches.filter(b => b.status === "inactive").length;
  
  
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const newBranches = branches.filter(b => new Date(b.startedDate) >= twoYearsAgo).length;

  const handleSave = (data: Branch) => {
    if (editingBranch) {
      setBranches((prev) =>
        prev.map((b) => (b.id === data.id ? data : b))
      );
    } else {
      setBranches((prev) => [...prev, data]);
    }
    setFormOpen(false);
    setEditingBranch(null);
  };

  const confirmDelete = () => {
    if (!deleteBranch) return;
    setBranches((prev) => prev.filter((b) => b.id !== deleteBranch.id));
    setDeleteBranch(null);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* BRANCHES */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-blue-900">
          Branches
        </h3>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          <StatCard 
            title="Total Branches" 
            value={totalBranches.toString()} 
            subtitle="All registered" 
          />
          <StatCard 
            title="Active Branches" 
            value={activeBranches.toString()} 
            subtitle="Currently operational" 
          />
          <StatCard 
            title="Inactive Branches" 
            value={inactiveBranches.toString()} 
            subtitle="Temporarily closed" 
          />
          <StatCard 
            title="New Branches" 
            value={newBranches.toString()} 
            subtitle="Last 2 years" 
          />
        </div>

        {/* HEADER & SEARCH */}
        <div className="flex items-center justify-between pt-2">
          <div className="relative w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search branch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditingBranch(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Branch
          </Button>
        </div>

        {/* TABLE */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "BRANCH",
                  "ADDRESS",
                  "LOCATION",
                  "MANAGER",
                  "STARTED",
                  "STATUS",
                  "ACTION",
                ].map((h) => (
                  <TableHead
                    key={h}
                    className="text-[11px] font-semibold text-blue-900 uppercase px-4"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((b, i) => (
                <TableRow key={b.id} className={i % 2 ? "bg-sky-100/60" : ""}>
                  <TableCell className="px-4 font-medium">{b.branchName}</TableCell>
                  <TableCell className="px-4">{b.address}</TableCell>
                  <TableCell className="px-4">{b.location}</TableCell>
                  <TableCell className="px-4">
                    <span className={`${b.manager === "Unassigned" ? "text-slate-400" : "text-gray-900"}`}>
                      {b.manager}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    {formatDate(b.startedDate)}
                  </TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        b.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-blue-900 hover:underline"
                        onClick={() => {
                          setEditingBranch(b);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => setDeleteBranch(b)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODALS */}
      {formOpen && (
        <BranchFormModal
          initialData={editingBranch}
          onClose={() => setFormOpen(false)}
          onConfirm={handleSave}
        />
      )}

      {deleteBranch && (
        <ConfirmDeleteModal
          name={deleteBranch.branchName}
          onCancel={() => setDeleteBranch(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function BranchFormModal({
  initialData,
  onClose,
  onConfirm,
}: {
  initialData: Branch | null;
  onClose: () => void;
  onConfirm: (data: Branch) => void;
}) {
  const [form, setForm] = useState<Branch>(
    initialData ?? {
      id: crypto.randomUUID(),
      branchName: "",
      address: "",
      location: "",
      startedDate: "",
      status: "active",
      manager: "Unassigned",
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl px-6 py-5 relative">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialData ? "Update Branch" : "Add Branch"}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full border text-gray-500 hover:text-gray-800"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Branch Name">
            <Input
              placeholder="Full name"
              value={form.branchName}
              onChange={(e) =>
                setForm({ ...form, branchName: e.target.value })
              }
            />
          </Field>

          <Field label="Branch Address">
            <Input
              placeholder="Address"
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />
          </Field>

          <Field label="Location">
            <Input
              placeholder="City / Area"
              value={form.location}
              onChange={(e) =>
                setForm({ ...form, location: e.target.value })
              }
            />
          </Field>

          <Field label="Started Date">
            <Input
              type="date"
              value={form.startedDate}
              onChange={(e) =>
                setForm({ ...form, startedDate: e.target.value })
              }
            />
          </Field>

          <Field label="Assign Manager">
            <Select
              value={form.manager}
              onValueChange={(value) =>
                setForm({ ...form, manager: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {availableManagers.map((manager) => (
                  <SelectItem 
                    key={manager} 
                    value={manager}
                    className="focus:bg-primary focus:text-white"
                  >
                    {manager}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Branch Status">
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm({ ...form, status: value as "active" | "inactive" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" className="focus:bg-primary focus:text-white">
                  Active
                </SelectItem>
                <SelectItem value="inactive" className="focus:bg-primary focus:text-white">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="rounded-full px-6" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white"
            onClick={() => onConfirm(form)}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white max-w-sm w-full rounded-2xl p-6 text-center">
        <Trash2 className="mx-auto text-red-600 mb-3" />
        <h3 className="text-lg font-semibold">Delete Branch</h3>
        <p className="text-sm text-slate-500 mt-1">
          Are you sure you want to delete <b>{name}</b>?
        </p>

        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="bg-red-600 text-white" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}