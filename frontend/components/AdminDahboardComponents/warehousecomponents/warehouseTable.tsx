'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StatCard from '@/components/StatCard';

type Warehouse = {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  branch: string;
  location: string;
  address: string;
  type: 'Central' | 'Regional' | 'Dark Store';
  capacity: string;
  status: 'active' | 'inactive';
};

const initialWarehouses: Warehouse[] = [
  {
    id: '1',
    warehouseName: 'Central Distribution Hub',
    warehouseCode: 'WH-001',
    branch: 'CityWave Store',
    location: 'Ernakulam',
    address: 'MG Road, Near Metro Station',
    type: 'Central',
    capacity: '50000 sqft',
    status: 'active',
  },
  {
    id: '2',
    warehouseName: 'South Regional Warehouse',
    warehouseCode: 'WH-002',
    branch: 'UrbanHub Outlet',
    location: 'Kochi',
    address: 'Vyttila Industrial Area',
    type: 'Regional',
    capacity: '30000 sqft',
    status: 'active',
  },
  {
    id: '3',
    warehouseName: 'North Storage Unit',
    warehouseCode: 'WH-003',
    branch: 'PrimePoint Store',
    location: 'Trivandrum',
    address: 'Pattom Junction, NH-66',
    type: 'Dark Store',
    capacity: '15000 sqft',
    status: 'inactive',
  },
  {
    id: '4',
    warehouseName: 'East Logistics Center',
    warehouseCode: 'WH-004',
    branch: 'CityWave Store',
    location: 'Thrissur',
    address: 'Bypass Road, East Gate',
    type: 'Regional',
    capacity: '35000 sqft',
    status: 'active',
  },
  {
    id: '5',
    warehouseName: 'Backup Storage Facility',
    warehouseCode: 'WH-005',
    branch: 'UrbanHub Outlet',
    location: 'Kozhikode',
    address: 'Beach Road, Port Area',
    type: 'Dark Store',
    capacity: '20000 sqft',
    status: 'inactive',
  },
];

const availableBranches = ['CityWave Store', 'UrbanHub Outlet', 'PrimePoint Store'];

const warehouseTypes = ['Central', 'Regional', 'Dark Store'];

export default function WarehouseReport() {
  const [warehouses, setWarehouses] = useState(initialWarehouses);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null);

  const filtered = warehouses.filter((w) =>
    `${w.warehouseName} ${w.warehouseCode} ${w.location} ${w.branch}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // Calculate statistics
  const totalWarehouses = warehouses.length;
  const activeWarehouses = warehouses.filter((w) => w.status === 'active').length;
  const inactiveWarehouses = warehouses.filter((w) => w.status === 'inactive').length;

  // Calculate average capacity from string values
  const totalCapacity = warehouses.reduce((sum, w) => {
    const numValue = parseInt(w.capacity.replace(/\D/g, '')) || 0;
    return sum + numValue;
  }, 0);
  const averageCapacity = Math.round(totalCapacity / warehouses.length);

  const handleSave = (data: Warehouse) => {
    if (editingWarehouse) {
      setWarehouses((prev) => prev.map((w) => (w.id === data.id ? data : w)));
    } else {
      setWarehouses((prev) => [...prev, data]);
    }
    setFormOpen(false);
    setEditingWarehouse(null);
  };

  const confirmDelete = () => {
    if (!deleteWarehouse) return;
    setWarehouses((prev) => prev.filter((w) => w.id !== deleteWarehouse.id));
    setDeleteWarehouse(null);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* WAREHOUSES */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-blue-900">Warehouses</h3>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          <StatCard
            title="Total Warehouses"
            value={totalWarehouses.toString()}
            subtitle="All registered"
          />
          <StatCard
            title="Active Warehouses"
            value={activeWarehouses.toString()}
            subtitle="Currently operational"
          />
          <StatCard
            title="Inactive Warehouses"
            value={inactiveWarehouses.toString()}
            subtitle="Temporarily closed"
          />
          <StatCard
            title="Average Capacity"
            value={averageCapacity.toLocaleString()}
            subtitle="sq. ft per warehouse"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="relative w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search warehouse"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditingWarehouse(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Warehouse
          </Button>
        </div>

        {/* TABLE */}
        <div className="rounded-2xl bg-white shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  'WAREHOUSE NAME',
                  'CODE',
                  'BRANCH',
                  'LOCATION',
                  'ADDRESS',
                  'CAPACITY',
                  'STATUS',
                  'ACTION',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-semibold text-blue-900 uppercase px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((w, i) => (
                <tr
                  key={w.id}
                  className={`border-b border-gray-100 ${i % 2 ? 'bg-sky-100/60' : ''}`}
                >
                  <td className="px-4 py-3 text-sm font-medium">{w.warehouseName}</td>
                  <td className="px-4 py-3 text-sm text-blue-900 font-medium">{w.warehouseCode}</td>
                  <td className="px-4 py-3 text-sm">{w.branch}</td>
                  <td className="px-4 py-3 text-sm">{w.location}</td>
                  <td className="px-4 py-3 text-sm">{w.address}</td>
                  <td className="px-4 py-3 text-sm font-medium">{w.capacity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        w.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-blue-900 hover:underline"
                        onClick={() => {
                          setEditingWarehouse(w);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => setDeleteWarehouse(w)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {formOpen && (
        <WarehouseFormModal
          initialData={editingWarehouse}
          onClose={() => setFormOpen(false)}
          onConfirm={handleSave}
        />
      )}

      {deleteWarehouse && (
        <ConfirmDeleteModal
          name={deleteWarehouse.warehouseName}
          onCancel={() => setDeleteWarehouse(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function WarehouseFormModal({
  initialData,
  onClose,
  onConfirm,
}: {
  initialData: Warehouse | null;
  onClose: () => void;
  onConfirm: (data: Warehouse) => void;
}) {
  const [form, setForm] = useState<Warehouse>(
    initialData ?? {
      id: crypto.randomUUID(),
      warehouseName: '',
      warehouseCode: '',
      branch: availableBranches[0],
      location: '',
      address: '',
      type: 'Regional',
      capacity: '',
      status: 'active',
    },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl px-6 py-5 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialData ? 'Update Warehouse' : 'Add Warehouse'}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full border text-gray-500 hover:text-gray-800"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Warehouse Name">
            <Input
              placeholder="Enter warehouse name"
              value={form.warehouseName}
              onChange={(e) => setForm({ ...form, warehouseName: e.target.value })}
            />
          </Field>

          <Field label="Warehouse Code">
            <Input
              placeholder="e.g., WH-001"
              value={form.warehouseCode}
              onChange={(e) => setForm({ ...form, warehouseCode: e.target.value })}
            />
          </Field>

          <Field label="Branch">
            <Select
              value={form.branch}
              onValueChange={(value) => setForm({ ...form, branch: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {availableBranches.map((branch) => (
                  <SelectItem
                    key={branch}
                    value={branch}
                    className="focus:bg-primary focus:text-white"
                  >
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Location / City">
            <Input
              placeholder="Enter city"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>

          <Field label="Full Address">
            <Input
              placeholder="Enter complete address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>

          <Field label="Warehouse Type">
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  type: value as 'Central' | 'Regional' | 'Dark Store',
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {warehouseTypes.map((type) => (
                  <SelectItem key={type} value={type} className="focus:bg-primary focus:text-white">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Capacity">
            <Input
              placeholder="e.g., 30000 sqft"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </Field>

          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm({ ...form, status: value as 'active' | 'inactive' })
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
        <h3 className="text-lg font-semibold">Delete Warehouse</h3>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
