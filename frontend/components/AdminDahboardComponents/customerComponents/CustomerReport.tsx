'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Users,
  Building2,
  Eye,
  RefreshCw,
  Wallet,
  Smartphone,
  Mail,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatCard from '@/components/StatCard';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getCustomers, Customer } from '@/lib/customer';
import { getBranches, Branch } from '@/lib/branch';
import { getAllProducts, Product } from '@/lib/product';
import { getInvoices, Invoice } from '@/lib/invoice';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { formatCurrency } from '@/lib/format';
import { getOpeningBalanceEntries, OpeningBalanceEntry } from '@/lib/openingBalance';

export default function CustomerReport() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalanceEntry[]>([]);

  const [search, setSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [showPendingCashOnly, setShowPendingCashOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<
    'overview' | 'products' | 'invoices' | 'opening-balances'
  >('overview');

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [customersRes, branchesRes, productsRes, invoicesRes, openingBalancesRes] =
        await Promise.all([
          getCustomers().catch((err) => {
            console.error('Failed to fetch customers:', err);
            return [] as Customer[];
          }),
          getBranches().catch((err) => {
            console.error('Failed to fetch branches:', err);
            return { success: false, data: [] } as { success: boolean; data: Branch[] };
          }),
          getAllProducts({ limit: 2000 }).catch((err) => {
            console.error('Failed to fetch products:', err);
            return [] as Product[];
          }),
          getInvoices().catch((err) => {
            console.error('Failed to fetch invoices:', err);
            return [] as Invoice[];
          }),
          getOpeningBalanceEntries({ limit: 1000 }).catch((err) => {
            console.error('Failed to fetch opening balances:', err);
            return { data: [] } as { data: OpeningBalanceEntry[] };
          }),
        ]);

      setCustomers(customersRes);

      if (Array.isArray(branchesRes)) {
        setBranches(branchesRes);
      } else if (branchesRes && branchesRes.success && Array.isArray(branchesRes.data)) {
        setBranches(branchesRes.data);
      }

      setProducts(productsRes);
      setInvoices(invoicesRes);
      setOpeningBalances(openingBalancesRes?.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load customer report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getBranchName = (branchId?: string) => {
    if (!branchId) return 'Unassigned';
    const branch = branches.find((b) => b.id === branchId || b.branch_id === branchId);
    return branch ? branch.name : 'Unassigned';
  };

  const getCustomerProducts = (customerId: string) => {
    return products.filter((p) => p.customer_id === customerId);
  };

  const getCustomerInvoices = (customerId: string) => {
    return invoices.filter((i) => i.customerId === customerId);
  };

  const getCustomerBrands = (customerId: string) => {
    const custProds = getCustomerProducts(customerId);
    const uniqueBrands = new Set(custProds.map((p) => p.brand).filter(Boolean));
    return Array.from(uniqueBrands);
  };

  const getCustomerOpeningBalances = (customerId: string) => {
    return openingBalances.filter((ob) => ob.customerId === customerId);
  };

  const getCustomerOutstandingMigratedBalance = (customerId: string) => {
    return getCustomerOpeningBalances(customerId)
      .filter((ob) => !ob.isFullySettled)
      .reduce((sum, ob) => sum + Number(ob.remainingBalance || 0), 0);
  };

  const isPendingCashCustomer = (customerId: string) => {
    const custInvoices = getCustomerInvoices(customerId);
    // An invoice status that is not paid, not cancelled, and not draft
    const unpaidStatuses = [
      'SENT',
      'PARTIAL',
      'INVOICED',
      'PENDING',
      'OPEN',
      'APPROVED',
      'ACCEPTED',
      'PENDING_CONFIRMATION',
      'ISSUED',
      'WAITING_FINANCE_APPROVAL',
      'CUSTOMER_ACCEPTED',
      'FINANCE_APPROVED',
      'SENT_TO_CUSTOMER',
    ];
    return custInvoices.some(
      (inv) =>
        unpaidStatuses.includes(inv.status) &&
        (inv.securityDepositMode === 'CASH' || inv.notes?.toLowerCase().includes('cash')),
    );
  };

  // Filter logic
  const filteredCustomers = customers.filter((cust) => {
    // 1. Search filter
    const matchesSearch =
      cust.name.toLowerCase().includes(search.toLowerCase()) ||
      (cust.email && cust.email.toLowerCase().includes(search.toLowerCase())) ||
      (cust.phone && cust.phone.includes(search));

    // 2. Branch filter
    const matchesBranch = selectedBranchId === 'all' || cust.branch_id === selectedBranchId;

    // 3. Pending Cash filter
    const matchesPendingCash = !showPendingCashOnly || isPendingCashCustomer(cust.id);

    return matchesSearch && matchesBranch && matchesPendingCash;
  });

  useEffect(() => {
    setTotal(filteredCustomers.length);
  }, [filteredCustomers.length, setTotal]);

  const paginatedCustomers = filteredCustomers.slice((page - 1) * limit, page * limit);

  // Statistics
  const totalCount = customers.length;
  const activeCount = customers.filter((c) => c.isActive).length;
  const pendingCashCount = customers.filter((c) => isPendingCashCustomer(c.id)).length;
  const totalBranchesCount = branches.length;

  const handleOpenDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailTab('overview');
    setIsDetailOpen(true);
  };

  // Prepare branch select options for SearchableSelect
  const branchOptions = [
    { value: 'all', label: 'All Branches' },
    ...branches.map((b) => ({
      value: b.id || b.branch_id || '',
      label: b.name,
      description: b.location || undefined,
    })),
  ];

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen p-6 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-slate-500 font-medium">Loading customers directory...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-6 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Customers Directory</h2>
          <p className="text-sm text-slate-500">
            View, search, and monitor customer installations and payment statuses across all
            branches
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-200">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={totalCount.toString()}
          subtitle="All registered clients"
        />
        <StatCard
          title="Active Customers"
          value={activeCount.toString()}
          subtitle="Actively operational"
        />
        <StatCard
          title="Pending Cash Clients"
          value={pendingCashCount.toString()}
          subtitle="Awaiting cash payment"
        />
        <StatCard
          title="Total Branches"
          value={totalBranchesCount.toString()}
          subtitle="Active branch offices"
        />
      </div>

      {/* Filter Block */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:max-w-2xl">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Searchable Branch Selector */}
            <div className="w-full">
              <SearchableSelect
                options={branchOptions}
                value={selectedBranchId}
                onValueChange={(val) => {
                  setSelectedBranchId(val);
                  setPage(1);
                }}
                placeholder="Search/Select Branch..."
              />
            </div>
          </div>

          {/* Toggle Switch for Pending Cash Customers */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-100/50 transition-colors w-full sm:w-auto shrink-0 justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-700">Pending Cash Customers</span>
            </div>
            <button
              onClick={() => {
                setShowPendingCashOnly(!showPendingCashOnly);
                setPage(1);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showPendingCashOnly ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showPendingCashOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-4 px-4">
                  Customer Details
                </TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase">
                  Contact Information
                </TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase">
                  Branch & Location
                </TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase">
                  Products / Brands
                </TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase text-center">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase text-right py-4 px-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                    No customers found matching the search and filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((cust, idx) => {
                  const custProducts = getCustomerProducts(cust.id);
                  const custBrands = getCustomerBrands(cust.id);
                  const hasPendingCash = isPendingCashCustomer(cust.id);

                  return (
                    <TableRow
                      key={cust.id}
                      className={`hover:bg-slate-50/50 transition-colors ${idx % 2 ? 'bg-slate-50/20' : 'bg-white'}`}
                    >
                      {/* Name Details */}
                      <TableCell className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900 text-sm">{cust.name}</span>
                          <span className="text-[10px] text-slate-400">
                            Registered: {new Date(cust.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {cust.email && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <span>{cust.email}</span>
                            </div>
                          )}
                          {cust.phone && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                              <span>{cust.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Branch & Location */}
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{getBranchName(cust.branch_id)}</span>
                          </div>
                          {(cust.location || cust.address) && (
                            <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[200px]">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{cust.location || cust.address}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Products / Brands */}
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {custProducts.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-700">
                                {custProducts.length} Product(s):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {custBrands.map((brand) => (
                                  <span
                                    key={brand}
                                    className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5"
                                  >
                                    {brand}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              No products allocated
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status Badges */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cust.isActive
                                ? 'bg-green-50 text-green-700 border border-green-100'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cust.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          {hasPendingCash && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1 animate-pulse">
                              <Wallet className="h-2.5 w-2.5" /> PENDING CASH
                            </span>
                          )}
                          {getCustomerOutstandingMigratedBalance(cust.id) > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
                              OB: QAR{' '}
                              {getCustomerOutstandingMigratedBalance(cust.id).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-4 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(cust)}
                          className="h-8 px-2.5 text-xs font-semibold gap-1.5 hover:bg-slate-50 border-slate-200"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-200">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Customer Detail Dialog */}
      {selectedCustomer && (
        <Dialog open={isDetailOpen} onOpenChange={(val) => !val && setIsDetailOpen(false)}>
          <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl shadow-xl">
            {/* Header info */}
            <DialogHeader className="p-6 border-b flex flex-row items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    {selectedCustomer.name}
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Customer Account Dashboard • Branch: {getBranchName(selectedCustomer.branch_id)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedCustomer.isActive
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {selectedCustomer.isActive ? 'Active Account' : 'Inactive'}
                </span>
                {isPendingCashCustomer(selectedCustomer.id) && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                    <Wallet className="h-3 w-3" /> Pending Cash
                  </span>
                )}
              </div>
            </DialogHeader>

            {/* Navigation Tabs */}
            <div className="flex border-b px-6 shrink-0 bg-white">
              {(['overview', 'products', 'invoices', 'opening-balances'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`py-3 px-4 text-sm font-semibold capitalize border-b-2 transition-all ${
                    detailTab === tab
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'opening-balances' ? 'Opening Balances' : tab}
                </button>
              ))}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 space-y-6">
              {/* Tab 1: Overview */}
              {detailTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Account profile details */}
                  <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider border-b pb-2">
                      Profile Details
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 text-sm">
                        <span className="text-slate-400 font-medium">Email:</span>
                        <span className="col-span-2 text-slate-700 font-semibold">
                          {selectedCustomer.email || 'N/A'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 text-sm">
                        <span className="text-slate-400 font-medium">Phone:</span>
                        <span className="col-span-2 text-slate-700 font-semibold">
                          {selectedCustomer.phone || 'N/A'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 text-sm">
                        <span className="text-slate-400 font-medium">Location:</span>
                        <span className="col-span-2 text-slate-700 font-semibold">
                          {selectedCustomer.location || 'N/A'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 text-sm">
                        <span className="text-slate-400 font-medium">Address:</span>
                        <span className="col-span-2 text-slate-700 text-xs font-semibold">
                          {selectedCustomer.address || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Counters */}
                  <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider border-b pb-2">
                      Account Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                          {getCustomerProducts(selectedCustomer.id).length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                          Products
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                          {getCustomerInvoices(selectedCustomer.id).length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                          Invoices
                        </span>
                      </div>
                    </div>
                    {isPendingCashCustomer(selectedCustomer.id) && (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex gap-2.5 items-start">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">
                            Pending Collection Action Required
                          </p>
                          <p className="text-[10px] text-amber-600 mt-0.5">
                            This customer has cash-settled contracts/invoices that are currently
                            unpaid. Please follow up.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Allocated Products */}
              {detailTab === 'products' && (
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Model / Product Name</TableHead>
                        <TableHead>Ownership</TableHead>
                        <TableHead className="text-right">Rent / Lease Price</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomerProducts(selectedCustomer.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-slate-400 italic">
                            No products allocated to this customer.
                          </TableCell>
                        </TableRow>
                      ) : (
                        getCustomerProducts(selectedCustomer.id).map((prod) => (
                          <TableRow key={prod.id} className="hover:bg-slate-50/40">
                            <TableCell className="font-bold text-slate-800">
                              {prod.serial_no}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                                {prod.brand}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div>
                                <div className="font-medium text-slate-800">{prod.name}</div>
                                <div className="text-slate-400">
                                  {prod.model?.model_name ||
                                    prod.model?.model_no ||
                                    'Model ID: ' + (prod.model || 'N/A')}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-600">
                              {prod.ownership || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {prod.ownership === 'RENT' &&
                                `${formatCurrency(prod.rent_price_monthly || 0)}/mo`}
                              {prod.ownership === 'LEASE' &&
                                `${formatCurrency(prod.lease_price_monthly || 0)}/mo`}
                              {prod.ownership === 'SALE' && formatCurrency(prod.sale_price || 0)}
                              {!prod.ownership && '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  prod.product_status === 'RENTED' || prod.product_status === 'SOLD'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-green-50 text-green-700'
                                }`}
                              >
                                {prod.product_status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Tab 3: Invoice History */}
              {detailTab === 'invoices' && (
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Sale Type</TableHead>
                        <TableHead>Date / Period</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-center">Security Mode</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomerInvoices(selectedCustomer.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-slate-400 italic">
                            No invoices generated for this customer.
                          </TableCell>
                        </TableRow>
                      ) : (
                        getCustomerInvoices(selectedCustomer.id).map((inv) => {
                          const isCashInvoice =
                            inv.securityDepositMode === 'CASH' ||
                            inv.notes?.toLowerCase().includes('cash');
                          const isUnpaid = [
                            'SENT',
                            'PARTIAL',
                            'INVOICED',
                            'PENDING',
                            'OPEN',
                            'APPROVED',
                            'ACCEPTED',
                            'PENDING_CONFIRMATION',
                            'ISSUED',
                            'WAITING_FINANCE_APPROVAL',
                            'CUSTOMER_ACCEPTED',
                            'FINANCE_APPROVED',
                            'SENT_TO_CUSTOMER',
                          ].includes(inv.status);

                          return (
                            <TableRow
                              key={inv.id}
                              className={`hover:bg-slate-50/40 ${isCashInvoice && isUnpaid ? 'bg-amber-50/10' : ''}`}
                            >
                              <TableCell className="font-bold text-blue-600">
                                {inv.invoiceNumber}
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-slate-600">
                                {inv.saleType || 'SERVICE'}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {inv.effectiveFrom && inv.effectiveTo ? (
                                  <span>
                                    {new Date(inv.effectiveFrom).toLocaleDateString()} -{' '}
                                    {new Date(inv.effectiveTo).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-800">
                                {formatCurrency(inv.totalAmount || inv.grossAmount || 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    inv.securityDepositMode === 'CASH'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {inv.securityDepositMode || 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      inv.status === 'PAID'
                                        ? 'bg-green-50 text-green-700'
                                        : isUnpaid
                                          ? 'bg-orange-50 text-orange-700 border border-orange-100'
                                          : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {inv.status}
                                  </span>
                                  {isCashInvoice && isUnpaid && (
                                    <span className="text-[8px] font-black text-amber-700 uppercase tracking-tighter">
                                      Pending Cash Payment
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Tab 4: Opening Balances */}
              {detailTab === 'opening-balances' && (
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Entry #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Original Value</TableHead>
                        <TableHead className="text-right">Remaining Balance</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomerOpeningBalances(selectedCustomer.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-slate-400 italic">
                            No migrated opening balances found for this customer.
                          </TableCell>
                        </TableRow>
                      ) : (
                        getCustomerOpeningBalances(selectedCustomer.id).map((ob) => (
                          <TableRow key={ob.id} className="hover:bg-slate-50/40">
                            <TableCell className="font-bold text-slate-850">
                              <div>{ob.entryNumber}</div>
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                Migrated: {new Date(ob.migratedAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-650">
                              {ob.balanceType.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              QAR {Number(ob.originalTotalAmount).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-800">
                              QAR {Number(ob.remainingBalance).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  ob.isFullySettled
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}
                              >
                                {ob.isFullySettled ? 'Settled' : 'Outstanding'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-white flex justify-end shrink-0">
              <Button onClick={() => setIsDetailOpen(false)}>Close Details</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
