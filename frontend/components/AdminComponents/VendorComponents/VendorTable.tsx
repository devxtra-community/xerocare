"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Eye, Edit, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

type Vendor = {
  id: string;
  name: string;
  type: "Supplier" | "Distributor" | "Service";
  contactPerson: string;
  phone: string;
  email: string;
  totalOrders: number;
  purchaseValue: number;
  outstandingAmount: number;
  status: "Active" | "On Hold";
};

const initialVendors: Vendor[] = [
  {
    id: "1",
    name: "ABC Supplies",
    type: "Supplier",
    contactPerson: "John Doe",
    phone: "+91 9876543210",
    email: "john@abcsupplies.com",
    totalOrders: 45,
    purchaseValue: 1200000,
    outstandingAmount: 50000,
    status: "Active",
  },
  {
    id: "2",
    name: "XYZ Distributors",
    type: "Distributor",
    contactPerson: "Jane Smith",
    phone: "+91 9876543211",
    email: "jane@xyz.com",
    totalOrders: 32,
    purchaseValue: 850000,
    outstandingAmount: 0,
    status: "Active",
  },
  {
    id: "3",
    name: "Tech Solutions",
    type: "Service",
    contactPerson: "Mike Ross",
    phone: "+91 9876543212",
    email: "mike@techsol.com",
    totalOrders: 12,
    purchaseValue: 450000,
    outstandingAmount: 25000,
    status: "On Hold",
  },
  {
    id: "4",
    name: "Global Traders",
    type: "Supplier",
    contactPerson: "Sarah Lee",
    phone: "+91 9876543213",
    email: "sarah@global.com",
    totalOrders: 56,
    purchaseValue: 1500000,
    outstandingAmount: 120000,
    status: "Active",
  },
  {
    id: "5",
    name: "Fast Logistics",
    type: "Service",
    contactPerson: "David Kim",
    phone: "+91 9876543214",
    email: "david@fastlog.com",
    totalOrders: 8,
    purchaseValue: 120000,
    outstandingAmount: 0,
    status: "Active",
  },
];

export default function VendorTable() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Supplier" | "Distributor" | "Service">("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase()) ||
                          vendor.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "All" || vendor.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSave = (data: Vendor) => {
    // In a real app, this would be an API call
    if (editingVendor) {
      setVendors((prev) => prev.map((v) => (v.id === data.id ? data : v)));
    } else {
      setVendors((prev) => [...prev, data]);
    }
    setFormOpen(false);
    setEditingVendor(null);
  };

  const confirmDelete = () => {
    if (!deleteVendor) return;
    setVendors((prev) => prev.filter((v) => v.id !== deleteVendor.id));
    setDeleteVendor(null);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-white">
                <Filter className="h-4 w-4" />
                Filter: {filterType}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterType("All")}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("Supplier")}>Supplier</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("Distributor")}>Distributor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("Service")}>Service</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            className="bg-blue-900 text-white gap-2"
            onClick={() => {
              setEditingVendor(null);
              setFormOpen(true);
            }}
          >
             <Plus size={16} /> Add Vendor
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-white border-b border-gray-200">
            <TableRow>
              <TableHead className="font-semibold text-[11px] text-blue-900 uppercase">Vendor Name</TableHead>
              <TableHead className="font-semibold text-[11px] text-blue-900 uppercase">Code</TableHead>
              <TableHead className="font-semibold text-[11px] text-blue-900 uppercase">Type</TableHead>
              <TableHead className="font-semibold text-[11px] text-blue-900 uppercase">Contact</TableHead>
              <TableHead className="font-semibold text-[11px] text-blue-900 uppercase">Details</TableHead>
              <TableHead className="text-right font-semibold text-[11px] text-blue-900 uppercase">Orders</TableHead>
              <TableHead className="text-right font-semibold text-[11px] text-blue-900 uppercase">Purchase Value</TableHead>
              <TableHead className="text-right font-semibold text-[11px] text-blue-900 uppercase">Outstanding</TableHead>
              <TableHead className="font-semibold text-[11px] text-blue-900 uppercase">Status</TableHead>
              <TableHead className="text-right font-semibold text-[11px] text-blue-900 uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor, index) => (
                <TableRow key={vendor.id} className={`border-b border-gray-100 hover:bg-slate-50/50 ${index % 2 !== 0 ? "bg-sky-100/60" : ""}`}>
                  <TableCell className="font-medium text-blue-900">{vendor.name}</TableCell>
                  <TableCell className="text-slate-500 font-medium">VND-{vendor.id.padStart(3, '0')}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      vendor.type === "Supplier" ? "bg-blue-100 text-blue-700" :
                      vendor.type === "Distributor" ? "bg-purple-100 text-purple-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>
                      {vendor.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{vendor.contactPerson}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-slate-500">
                      <span>{vendor.phone}</span>
                      <span>{vendor.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{vendor.totalOrders}</TableCell>
                  <TableCell className="text-right font-medium">₹ {vendor.purchaseValue.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium text-red-600">₹ {vendor.outstandingAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vendor.status === "Active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${vendor.status === "Active" ? "bg-green-600" : "bg-yellow-600"}`}></span>
                      {vendor.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                       >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                          setEditingVendor(vendor);
                          setFormOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteVendor(vendor)}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                        No vendors found matching your criteria.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODALS */}
      {formOpen && (
        <VendorFormModal
          initialData={editingVendor}
          onClose={() => setFormOpen(false)}
          onConfirm={handleSave}
        />
      )}

      {deleteVendor && (
        <ConfirmDeleteModal
          name={deleteVendor.name}
          onCancel={() => setDeleteVendor(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// ------------------- Helper Components ------------------- //
import { X, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function VendorFormModal({
  initialData,
  onClose,
  onConfirm,
}: {
  initialData: Vendor | null;
  onClose: () => void;
  onConfirm: (data: Vendor) => void;
}) {
  const [form, setForm] = useState<Vendor>(
    initialData ?? {
      id: crypto.randomUUID(),
      name: "",
      type: "Supplier",
      contactPerson: "",
      phone: "",
      email: "",
      totalOrders: 0,
       purchaseValue: 0,
       outstandingAmount: 0,
      status: "Active",
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl px-6 py-5 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialData ? "Update Vendor" : "Add Vendor"}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full border text-gray-500 hover:text-gray-800"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Vendor Name">
            <Input
              placeholder="Enter vendor name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          
           <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Person">
                <Input
                  placeholder="Enter contact person"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
              </Field>
               <Field label="Type">
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({ ...form, type: value as "Supplier" | "Distributor" | "Service" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Supplier">Supplier</SelectItem>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
           </div>

          <Field label="Phone">
            <Input
              placeholder="Enter phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>

          <Field label="Email">
            <Input
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>

          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm({ ...form, status: value as "Active" | "On Hold" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-full px-6"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full px-6 bg-blue-900 hover:bg-blue-800 text-white"
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
        <h3 className="text-lg font-semibold">Delete Vendor</h3>
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
