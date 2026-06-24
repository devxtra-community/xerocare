'use client';

import React, { useEffect, useState } from 'react';
import { getUserFromToken } from '@/lib/auth';
import { EmployeeJob } from '@/lib/employeeJob';
import EmployeeStatsCards from '@/components/employeeComponents/EmployeeStatsCards';
import EmployeeSalesGraph from '@/components/employeeComponents/EmployeeSalesGraph';
import EmployeeLeadsGraph from '@/components/employeeComponents/EmployeeLeadsGraph';
import EmployeeOrdersTable from '@/components/employeeComponents/EmployeeOrdersTable';
import { getMyInvoices, Invoice } from '@/lib/invoice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardList, Search, Activity, User, Key, FileText } from 'lucide-react';
import UsageRecordingModal from '@/components/Finance/UsageRecordingModal';

interface UserInfo {
  role: string;
  employeeJob?: string;
  userId?: string;
  branchId?: string;
}

export default function EmployeeDashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [contracts, setContracts] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<Invoice | null>(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);

  useEffect(() => {
    const currentUser = getUserFromToken() as unknown as UserInfo | null;
    setUser(currentUser);

    if (currentUser?.employeeJob === EmployeeJob.TECHNICIAN) {
      fetchContracts();
    }
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const allInvoices = await getMyInvoices();
      // Filter for active/expired rent and lease contracts
      const activeContracts = allInvoices.filter(
        (inv) =>
          (inv.saleType === 'RENT' || inv.saleType === 'LEASE') &&
          inv.type !== 'QUOTATION' &&
          inv.contractStatus !== 'COMPLETED',
      );
      setContracts(activeContracts);
    } catch (error) {
      console.error('Failed to fetch technician contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(
    (c) =>
      c.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  const isTechnician = user?.role === 'EMPLOYEE' && user?.employeeJob === EmployeeJob.TECHNICIAN;

  if (isTechnician) {
    return (
      <div className="bg-slate-50 min-h-full p-4 sm:p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Technician Portal</h1>
          <p className="text-sm text-slate-500 font-medium">
            Welcome back! Below are the active Rent & Lease contracts assigned to your branch.
            Select a contract to submit a new meter reading.
          </p>
        </div>

        {/* Custom Stats for Technician */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Rent Contracts
              </CardTitle>
              <Key className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {contracts.filter((c) => c.saleType === 'RENT').length}
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Lease Contracts
              </CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {contracts.filter((c) => c.saleType === 'LEASE').length}
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Ongoing Contracts
              </CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{contracts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="text-blue-500" size={18} /> Meter Reading Assignments
            </CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search contract number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-100 rounded-xl"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-600">
                      Contract Number
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">Customer</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">
                      Contract Period
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">Type</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">Status</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <span className="text-xs text-slate-400 mt-2 block">
                          Loading assignments...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                        No active assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((c) => (
                      <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-blue-600">
                          {c.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-bold text-slate-700 flex items-center gap-2">
                          <User size={14} className="text-slate-400" />
                          {c.customerName || 'Walk-in'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-medium">
                          {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A'} —{' '}
                          {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold px-2 py-0.5 shadow-none ${
                              c.saleType === 'RENT'
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-50'
                                : 'bg-purple-50 text-purple-700 hover:bg-purple-50'
                            }`}
                          >
                            {c.saleType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold px-2 py-0.5 shadow-none ${
                              c.status === 'EXPIRED'
                                ? 'bg-red-50 text-red-700 hover:bg-red-50'
                                : 'bg-green-50 text-green-700 hover:bg-green-50'
                            }`}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            className="bg-primary hover:bg-primary/95 text-white font-bold text-xs h-8 px-4 rounded-xl gap-1.5 transition-all"
                            onClick={() => {
                              setSelectedContract(c);
                              setIsUsageModalOpen(true);
                            }}
                          >
                            <ClipboardList size={14} /> Submit Meter Reading
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {isUsageModalOpen && selectedContract && (
          <UsageRecordingModal
            isOpen={isUsageModalOpen}
            onClose={() => setIsUsageModalOpen(false)}
            contractId={selectedContract.id}
            customerName={selectedContract.customerName}
            onSuccess={() => {
              setIsUsageModalOpen(false);
              fetchContracts();
            }}
          />
        )}
      </div>
    );
  }

  // Standard employee dashboard view
  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Employee Report</h3>
        <EmployeeStatsCards />

        <div className="flex flex-col lg:flex-row gap-6 w-full">
          <div className="w-full lg:w-1/2 space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Sales vs Rent vs Lease</h3>
            <EmployeeSalesGraph />
          </div>
          <div className="w-full lg:w-1/2 space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Leads Source</h3>
            <EmployeeLeadsGraph />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Recent Orders</h3>
          <EmployeeOrdersTable />
        </div>
      </div>
    </div>
  );
}
