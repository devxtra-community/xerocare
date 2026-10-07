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

  useEffect(() => {
    const currentUser = getUserFromToken() as unknown as UserInfo | null;
    setUser(currentUser);

    if (currentUser?.employeeJob === EmployeeJob.SERVICE_TECHNICIAN) {
      fetchContracts();
    }
  }, []);

  const filteredContracts = contracts.filter(
    (c) =>
      c.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  const isTechnician =
    user?.role === 'EMPLOYEE' && user?.employeeJob === EmployeeJob.SERVICE_TECHNICIAN;

  if (isTechnician) {
    return (
      <div className="bg-muted min-h-full p-4 sm:p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl sm:text-2xl font-medium text-primary tracking-tight">
            Technician Portal
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Welcome back! Below are the active Rent & Lease contracts assigned to your branch.
            Select a contract to submit a new meter reading.
          </p>
        </div>

        {/* Custom Stats for Technician */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Rent Contracts
              </CardTitle>
              <Key className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {contracts.filter((c) => c.saleType === 'RENT').length}
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Lease Contracts
              </CardTitle>
              <FileText className="h-4 w-4 text-lease" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {contracts.filter((c) => c.saleType === 'LEASE').length}
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Ongoing Contracts
              </CardTitle>
              <Activity className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{contracts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="border-b border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="text-primary" size={18} /> Meter Reading Assignments
            </CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contract number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted border-border rounded-xl"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-foreground">
                      Contract Number
                    </TableHead>
                    <TableHead className="font-bold text-xs text-foreground">Customer</TableHead>
                    <TableHead className="font-bold text-xs text-foreground">
                      Contract Period
                    </TableHead>
                    <TableHead className="font-bold text-xs text-foreground">Type</TableHead>
                    <TableHead className="font-bold text-xs text-foreground">Status</TableHead>
                    <TableHead className="font-bold text-xs text-foreground text-center">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <span className="text-xs text-muted-foreground mt-2 block">
                          Loading assignments...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-12 text-muted-foreground text-xs"
                      >
                        No active assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {c.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-bold text-foreground flex items-center gap-2">
                          <User size={14} className="text-muted-foreground" />
                          {c.customerName || 'Walk-in'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A'} —{' '}
                          {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold px-2 py-0.5 shadow-none ${
                              c.saleType === 'RENT'
                                ? 'bg-primary/10 text-primary hover:bg-primary/10'
                                : 'bg-lease/10 text-lease hover:bg-lease/10'
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
                                ? 'bg-destructive/10 text-destructive hover:bg-destructive/10'
                                : 'bg-success/10 text-success hover:bg-success/10'
                            }`}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs h-8 px-4 rounded-xl gap-1.5 transition-all"
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
            onClose={() => {
              setIsUsageModalOpen(false);
              setSelectedContract(null);
            }}
            contractId={selectedContract.id}
            customerName={selectedContract.customerName}
            onSuccess={() => {
              // Refresh only — do not close here. onSuccess fires as soon as the
              // record is saved, before the modal has shown its own receipt/next
              // step; closing here fights that and (via the render gate above)
              // fully unmounts the modal mid-flow instead of letting it finish.
              fetchContracts();
            }}
          />
        )}
      </div>
    );
  }

  // Standard employee dashboard view
  return (
    <div className="bg-card min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-medium text-foreground">Employee Report</h3>
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
