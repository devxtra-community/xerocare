'use client';

import React, { useEffect, useState } from 'react';
import { getCustomers, Customer } from '@/lib/customer';
import { getAllProducts, Product } from '@/lib/product';
import { CustomerServiceHistory } from '@/lib/serviceTicket';
import {
  getServiceContracts,
  createServiceContract,
  updateServiceContract,
  deleteServiceContract,
  ServiceContract,
} from '@/lib/serviceContract';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Search,
  Calendar,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';

interface CustomerMachine {
  id: string;
  modelName: string;
  serialNumber: string;
  ownership: string;
  warrantyEnd: string;
  activeContract: string;
  contractExpiry?: string;
}

interface BillingHistoryInvoice {
  productAllocations?: Array<{
    productId?: string;
    id: string;
    modelName?: string;
    serialNumber?: string;
    effectiveTo?: string;
    isUnderWarranty?: boolean;
  }>;
  effectiveTo?: string;
  isUnderWarranty?: boolean;
}

export default function ServiceContractsPage() {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ServiceContract | null>(null);

  // Form State
  const [formState, setFormState] = useState({
    customerId: '',
    productId: '',
    contractType: 'FSMA' as 'FSMA' | 'SMA' | 'AMC',
    startDate: '',
    endDate: '',
    contractValue: 0,
    coverageRules: {
      labour: true,
      consumables: true,
      travel: true,
    },
    status: 'ACTIVE',
  });

  const [customerIntel, setCustomerIntel] = useState<CustomerServiceHistory | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  useEffect(() => {
    if (formState.customerId) {
      setLoadingIntel(true);
      import('@/lib/serviceTicket').then(({ getCustomerServiceHistory }) => {
        getCustomerServiceHistory(formState.customerId)
          .then((res) => {
            setCustomerIntel(res);
          })
          .catch((err) => {
            console.error('Error fetching customer history:', err);
            setCustomerIntel(null);
          })
          .finally(() => {
            setLoadingIntel(false);
          });
      });
    } else {
      setCustomerIntel(null);
    }
  }, [formState.customerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, customersData, productsData] = await Promise.all([
        getServiceContracts(),
        getCustomers(),
        getAllProducts({ limit: 1000 }),
      ]);
      setContracts(contractsData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load contract and machine details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingContract(null);
    setFormState({
      customerId: '',
      productId: '',
      contractType: 'FSMA',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        .toISOString()
        .split('T')[0],
      contractValue: 0,
      coverageRules: {
        labour: true,
        consumables: true,
        travel: true,
      },
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contract: ServiceContract) => {
    setEditingContract(contract);
    setFormState({
      customerId: contract.customerId,
      productId: contract.productId,
      contractType: contract.contractType,
      startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
      contractValue: contract.contractValue || 0,
      coverageRules: contract.coverageRules || { labour: true, consumables: true, travel: true },
      status: contract.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.customerId) {
      toast.error('Please select a customer.');
      return;
    }
    if (!formState.productId) {
      toast.error('Please select a machine/product.');
      return;
    }

    try {
      if (editingContract) {
        await updateServiceContract(editingContract.id, formState);
        toast.success('Service contract updated successfully.');
      } else {
        await createServiceContract(formState);
        toast.success('Service contract registered successfully.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save service contract.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) return;
    try {
      await deleteServiceContract(id);
      toast.success('Contract deleted successfully.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete contract.');
    }
  };

  // Filter and search
  const filteredContracts = contracts.filter((c) => {
    const customer = customers.find((cust) => cust.id === c.customerId);
    const product = products.find((prod) => prod.id === c.productId);
    const customerName = customer ? customer.name.toLowerCase() : '';
    const serialNo = product ? product.serial_no.toLowerCase() : '';
    const modelName = product ? product.name.toLowerCase() : '';

    const matchesSearch =
      customerName.includes(searchTerm.toLowerCase()) ||
      serialNo.includes(searchTerm.toLowerCase()) ||
      modelName.includes(searchTerm.toLowerCase()) ||
      c.contractType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || c.contractType === filterType;

    return matchesSearch && matchesType;
  });

  const getStatusBadgeClass = (status: string) => {
    if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'EXPIRED') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.email || c.phone || 'No contact info',
  }));

  const getCustomerMachines = (intel: CustomerServiceHistory | null): CustomerMachine[] => {
    if (!intel) return [];
    const list: CustomerMachine[] = [];

    // 1. Rented Machines
    if (intel.billingHistory?.RENT) {
      (intel.billingHistory.RENT as unknown as BillingHistoryInvoice[]).forEach((invObj) => {
        const allocations = invObj.productAllocations || [];
        allocations.forEach((alloc) => {
          list.push({
            id: alloc.productId || alloc.id,
            modelName: alloc.modelName || 'Rented Printer',
            serialNumber: alloc.serialNumber || 'N/A',
            ownership: 'RENT',
            warrantyEnd: alloc.effectiveTo || 'N/A',
            activeContract: 'RENTAL',
          });
        });
      });
    }

    // 2. Leased Machines
    if (intel.billingHistory?.LEASE) {
      (intel.billingHistory.LEASE as unknown as BillingHistoryInvoice[]).forEach((invObj) => {
        const allocations = invObj.productAllocations || [];
        allocations.forEach((alloc) => {
          list.push({
            id: alloc.productId || alloc.id,
            modelName: alloc.modelName || 'Leased Printer',
            serialNumber: alloc.serialNumber || 'N/A',
            ownership: 'LEASE',
            warrantyEnd: alloc.effectiveTo || 'N/A',
            activeContract: 'LEASE',
          });
        });
      });
    }

    // 3. Purchased Machines (SALE)
    if (intel.billingHistory?.SALE) {
      (intel.billingHistory.SALE as unknown as BillingHistoryInvoice[]).forEach((invObj) => {
        const allocations = invObj.productAllocations || [];
        allocations.forEach((alloc) => {
          list.push({
            id: alloc.productId || alloc.id,
            modelName: alloc.modelName || 'Purchased Printer',
            serialNumber: alloc.serialNumber || 'N/A',
            ownership: 'SALE',
            warrantyEnd: alloc.isUnderWarranty ? 'Active' : 'Expired',
            activeContract: 'None',
          });
        });
      });
    }

    // 4. Contract Machines (from AMC, FSMA, SMA)
    const contractTypes = ['AMC', 'FSMA', 'SMA'];
    contractTypes.forEach((cType) => {
      if (intel.billingHistory?.[cType]) {
        (intel.billingHistory[cType] as unknown as BillingHistoryInvoice[]).forEach((invObj) => {
          const allocations = invObj.productAllocations || [];
          allocations.forEach((alloc) => {
            list.push({
              id: alloc.productId || alloc.id,
              modelName: alloc.modelName || `${cType} Printer`,
              serialNumber: alloc.serialNumber || 'N/A',
              ownership: 'CONTRACT',
              warrantyEnd: 'N/A',
              activeContract: cType,
              contractExpiry: alloc.effectiveTo || 'N/A',
            });
          });
        });
      }
    });

    // 5. Assigned Products / External
    if (intel.assignedProducts) {
      intel.assignedProducts.forEach((prod) => {
        if (!list.some((item) => item.serialNumber === prod.serial_no)) {
          list.push({
            id: prod.id,
            modelName: prod.name,
            serialNumber: prod.serial_no,
            ownership: prod.ownership || 'EXTERNAL',
            warrantyEnd: prod.warranty_end_date
              ? new Date(prod.warranty_end_date).toLocaleDateString()
              : 'N/A',
            activeContract: 'None',
          });
        }
      });
    }

    return list;
  };

  const customerMachines = getCustomerMachines(customerIntel);

  const productOptions =
    formState.customerId && customerMachines.length > 0
      ? customerMachines.map((m) => ({
          value: m.id,
          label: `${m.modelName} (S/N: ${m.serialNumber})`,
          description: `Ownership: ${m.ownership} | Contract: ${m.activeContract || 'None'}`,
        }))
      : products.map((p) => ({
          value: p.id,
          label: `${p.brand} ${p.name} (S/N: ${p.serial_no})`,
          description: `Ownership: ${p.ownership || 'SALE'} | Current Meter: ${p.meter_reading || 0}`,
        }));

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Service Contracts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage Service Agreements (FSMA, SMA, AMC) for customer and external machines.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Service Contract
        </Button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Total Contracts
            </CardTitle>
            <Layers className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-800">{contracts.length}</div>
            <p className="text-xs text-slate-400 mt-1">All service agreements registered</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Active FSMA
            </CardTitle>
            <Activity className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-indigo-600">
              {contracts.filter((c) => c.contractType === 'FSMA' && c.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Full service maintenance contracts</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Active SMA
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">
              {contracts.filter((c) => c.contractType === 'SMA' && c.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Service maintenance contracts</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Active AMC
            </CardTitle>
            <Activity className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">
              {contracts.filter((c) => c.contractType === 'AMC' && c.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Annual maintenance contracts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtering and Search Controls */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, serial number, model, or type..."
            className="pl-9 bg-slate-50/50 focus-visible:ring-blue-500 border-slate-200/80"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {['ALL', 'FSMA', 'SMA', 'AMC'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              onClick={() => setFilterType(type)}
              className={`text-xs px-4 py-2 font-medium ${
                filterType === type
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  : 'hover:bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm border-slate-200/80 overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="font-bold text-xs text-slate-600 w-[20%]">Customer</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[25%]">
                Machine (Serial)
              </TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[10%]">Type</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[12%]">Start Date</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[12%]">End Date</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[10%] text-right">
                Value
              </TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[11%]">Status</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[10%] text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm text-slate-500">
                  Loading service contracts...
                </TableCell>
              </TableRow>
            ) : filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm text-slate-500">
                  No service contracts found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((c) => {
                const customer = customers.find((cust) => cust.id === c.customerId);
                const product = products.find((prod) => prod.id === c.productId);
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-xs text-slate-800 truncate py-3">
                      {customer ? customer.name : 'Unknown Customer'}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {product ? `${product.brand} ${product.name}` : 'Unknown Product'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 mt-0.5 truncate">
                          S/N: {product ? product.serial_no : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {c.contractType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 py-3">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 py-3">
                      {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-700 text-right py-3">
                      QAR {Number(c.contractValue).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(
                          c.status,
                        )}`}
                      >
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(c)}
                          className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c.id)}
                          className="h-7 w-7 text-slate-500 hover:text-rose-600 hover:bg-rose-50/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl w-full p-6 bg-white rounded-xl shadow-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {editingContract ? 'Edit Service Contract' : 'Create Service Contract'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Fill in the form below to configure coverage rules and billing parameters for the
              service agreement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Customer Selection */}
              <div className="col-span-2 flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Select Customer</label>
                <SearchableSelect
                  options={customerOptions}
                  value={formState.customerId}
                  onValueChange={(val) =>
                    setFormState((prev) => ({ ...prev, customerId: val, productId: '' }))
                  }
                  placeholder="Choose customer..."
                />
              </div>

              {/* CUSTOMER MACHINES SUMMARY PANEL */}
              {formState.customerId && (
                <div className="col-span-2 border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-blue-600" /> Customer Machine Registry &
                      History
                    </h4>
                    {loadingIntel && (
                      <span className="text-[10px] text-slate-400 font-normal animate-pulse">
                        Loading machines...
                      </span>
                    )}
                  </div>

                  {loadingIntel ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Fetching customer machine details...
                    </div>
                  ) : customerMachines.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No machines registered for this customer.
                    </div>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                      {customerMachines.map((m, idx) => (
                        <div
                          key={m.id + '-' + m.serialNumber + '-' + idx}
                          onClick={() => {
                            setFormState((prev) => ({ ...prev, productId: m.id }));
                          }}
                          className={`p-2.5 border rounded-xl cursor-pointer text-xs transition flex flex-col gap-1 text-left ${
                            formState.productId === m.id
                              ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                              : 'border-slate-100 bg-white hover:border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{m.modelName}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
                              {m.ownership}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 mt-1">
                            <div>
                              Serial:{' '}
                              <span className="font-mono text-slate-700 font-semibold">
                                {m.serialNumber}
                              </span>
                            </div>
                            <div>
                              Warranty Expiry:{' '}
                              <span className="font-semibold text-slate-700">
                                {m.warrantyEnd || 'N/A'}
                              </span>
                            </div>
                            <div>
                              Active Contract:{' '}
                              <span
                                className={`font-bold ${m.activeContract && m.activeContract !== 'None' ? 'text-indigo-600' : 'text-slate-700'}`}
                              >
                                {m.activeContract || 'None'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Machine Selection */}
              <div className="col-span-2 flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Select Machine / Product</label>
                <SearchableSelect
                  options={productOptions}
                  value={formState.productId}
                  onValueChange={(val) => setFormState((prev) => ({ ...prev, productId: val }))}
                  placeholder="Choose machine..."
                />
              </div>

              {/* Contract Type */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Contract Type</label>
                <select
                  value={formState.contractType}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      contractType: e.target.value as 'FSMA' | 'SMA' | 'AMC',
                    }))
                  }
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-card focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="FSMA">FSMA (Full Service)</option>
                  <option value="SMA">SMA (Service Maintenace)</option>
                  <option value="AMC">AMC (Annual Maintenance)</option>
                </select>
              </div>

              {/* Contract Value */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Contract Value (QAR)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formState.contractValue}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      contractValue: Number(e.target.value) || 0,
                    }))
                  }
                  className="h-10 border-slate-200 focus-visible:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Start Date */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formState.startDate}
                  onChange={(e) => setFormState((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={formState.endDate}
                  onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              {/* Status */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Status</label>
                <select
                  value={formState.status}
                  onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value }))}
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-card focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>

              {/* Coverage Rules Configuration */}
              <div className="col-span-2 p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Coverage Model Options
                </span>
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cov-labour"
                      checked={formState.coverageRules.labour}
                      onCheckedChange={(val) =>
                        setFormState((prev) => ({
                          ...prev,
                          coverageRules: { ...prev.coverageRules, labour: !!val },
                        }))
                      }
                    />
                    <label
                      htmlFor="cov-labour"
                      className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
                    >
                      Cover Labour
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cov-consumables"
                      checked={formState.coverageRules.consumables}
                      onCheckedChange={(val) =>
                        setFormState((prev) => ({
                          ...prev,
                          coverageRules: { ...prev.coverageRules, consumables: !!val },
                        }))
                      }
                    />
                    <label
                      htmlFor="cov-consumables"
                      className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
                    >
                      Cover Consumables
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cov-travel"
                      checked={formState.coverageRules.travel}
                      onCheckedChange={(val) =>
                        setFormState((prev) => ({
                          ...prev,
                          coverageRules: { ...prev.coverageRules, travel: !!val },
                        }))
                      }
                    />
                    <label
                      htmlFor="cov-travel"
                      className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
                    >
                      Cover Travel/Transport
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm"
              >
                Save Contract
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
