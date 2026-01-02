'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

type Warehouse = {
  id: string;
  name: string;
  branch: string;
  address: string;
  location: string;
  status: 'active' | 'inactive';
};

const warehouses: Warehouse[] = [
  {
    id: '1',
    name: 'Central Distribution',
    branch: 'UrbanHub Outlet',
    address: 'MG Road, Ernakulam',
    location: 'Ernakulam',
    status: 'active',
  },
  {
    id: '2',
    name: 'Prime Storage Hub',
    branch: 'PrimePoint Store',
    address: 'Mavoor Road, Kozhikode',
    location: 'Kozhikode',
    status: 'active',
  },
  {
    id: '3',
    name: 'North Logistics Center',
    branch: 'MetroMart Outlet',
    address: 'Pattom, Thiruvananthapuram',
    location: 'Thrissur',
    status: 'active',
  },
  {
    id: '4',
    name: 'Metro Supply Depot',
    branch: 'CityWave Store',
    address: 'Punkunnam, Thrissur',
    location: 'Kannur',
    status: 'active',
  },
  {
    id: '5',
    name: 'Cargo Warehouse',
    branch: 'CornerSpot Outlet',
    address: 'Thavakkara, Kannur',
    location: 'Kottayam',
    status: 'active',
  },
  {
    id: '6',
    name: 'Central Distribution',
    branch: 'UrbanHub Outlet',
    address: 'MG Road, Ernakulam',
    location: 'Ernakulam',
    status: 'active',
  },
  {
    id: '7',
    name: 'Prime Storage Hub',
    branch: 'PrimePoint Store',
    address: 'Mavoor Road, Kozhikode',
    location: 'Kozhikode',
    status: 'active',
  },
  {
    id: '8',
    name: 'North Logistics Center',
    branch: 'MetroMart Outlet',
    address: 'Pattom, Thiruvananthapuram',
    location: 'Thrissur',
    status: 'active',
  },
  {
    id: '9',
    name: 'Metro Supply Depot',
    branch: 'CityWave Store',
    address: 'Punkunnam, Thrissur',
    location: 'Kannur',
    status: 'active',
  },
  {
    id: '10',
    name: 'Cargo Warehouse',
    branch: 'CornerSpot Outlet',
    address: 'Thavakkara, Kannur',
    location: 'Kottayam',
    status: 'active',
  },
];

export default function WarehouseReport() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWarehouses = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-blue-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-primary">Warehouse</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage and track warehouse information
            </p>
          </div>

          <Button size="sm" className="h-9 bg-blue-900 text-white sm:ml-auto">
            Add Warehouse
          </Button>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search warehouse"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-[220px] border-slate-200 h-9"
              />
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button variant="outline" size="sm" className="h-9">
                <ArrowUpDown className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Sort</span>
              </Button>

              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    'WAREHOUSE NAME',
                    'BRANCH NAME',
                    'WAREHOUSE ADDRESS',
                    'LOCATION',
                    'STATUS',
                    'ACTION',
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-primary font-semibold text-xs sm:text-sm whitespace-nowrap px-3"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredWarehouses.length ? (
                  filteredWarehouses.map((w, index) => (
                    <TableRow
                      key={w.id}
                      className={`${index % 2 === 1 ? 'bg-[#F4F9FF]' : 'bg-white'} hover:bg-[#EAF3FF]`}
                    >
                      <TableCell className="font-medium px-3 whitespace-nowrap">{w.name}</TableCell>
                      <TableCell className="px-3 whitespace-nowrap">{w.branch}</TableCell>
                      <TableCell className="px-3 whitespace-nowrap">{w.address}</TableCell>
                      <TableCell className="px-3 whitespace-nowrap">{w.location}</TableCell>
                      <TableCell className="px-3 text-blue-700 text-xs font-medium">
                        {w.status}
                      </TableCell>
                      <TableCell className="px-3 space-x-3 text-xs">
                        <button className="text-blue-600 hover:underline">Edit</button>
                        <button className="text-red-600 hover:underline">Delete</button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-slate-500 text-sm">
                      No warehouses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
