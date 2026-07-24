'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Globe,
  Landmark,
  User,
  Building2,
  Wrench,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCustomerById, updateCustomer, Customer, CreateCustomerData } from '@/lib/customer';
import { getCustomerServiceHistory, CustomerServiceHistory } from '@/lib/serviceTicket';
import { getAllModels, Model } from '@/lib/model';
import { getServiceContracts, ServiceContract } from '@/lib/serviceContract';
import CustomerFormDialog from '@/components/employeeComponents/CustomerFormDialog';
import {
  ServiceTicketHistoryPanel,
  BillingHistoryPanel,
} from '@/components/employeeComponents/CustomerHistoryPanels';
import {
  MachineAllocation,
  getRentedMachines,
  getLeasedMachines,
  getPurchasedMachines,
  getExternalMachines,
  getContractMachines,
} from '@/lib/machineAllocations';
import { isoToFlag } from '@/lib/countryOptions';
import { getBankCodeLabel } from '@/lib/bankCodeType';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<CustomerServiceHistory | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [activeContracts, setActiveContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [customerRes, historyRes, modelsRes, contractsRes] = await Promise.all([
        getCustomerById(id),
        getCustomerServiceHistory(id),
        getAllModels().catch(() => ({ data: [] as Model[] })),
        getServiceContracts({ customerId: id, status: 'ACTIVE' }).catch(
          () => [] as ServiceContract[],
        ),
      ]);
      setCustomer(customerRes);
      setHistory(historyRes);
      setModels(modelsRes.data);
      setActiveContracts(contractsRes);
    } catch (error) {
      console.error('Failed to load customer:', error);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const handleFormSubmit = async (data: Partial<CreateCustomerData>) => {
    if (!customer) return;
    try {
      await updateCustomer(customer.id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        status: data.status,
        vatNumber: data.vatNumber,
        country: data.country,
        stateProvince: data.stateProvince,
        city: data.city,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccounts: data.bankAccounts,
      });
      toast.success('Customer updated successfully');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update customer');
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50/50 min-h-full flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bg-blue-50/50 min-h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-primary font-bold">Customer not found</div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const bankAccounts = customer.bankAccounts?.length
    ? customer.bankAccounts
    : customer.bankName || customer.bankAccountNumber
      ? [
          {
            bankName: customer.bankName || '',
            accountHolderName: customer.name,
            accountNumber: customer.bankAccountNumber || '',
            isPrimary: true,
          },
        ]
      : [];

  return (
    <ProtectedRoute requiredModules={['customers']}>
      <div className="bg-blue-50/50 min-h-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-blue-200/50"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5 text-primary" />
            </Button>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-primary flex items-center gap-2">
                {customer.name}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                    customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {customer.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </h3>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                ID: #{customer.id}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 text-[11px] rounded-lg bg-primary hover:bg-primary/90 text-white gap-1.5 font-semibold"
            onClick={() => setDialogOpen(true)}
          >
            <Edit className="h-3.5 w-3.5" /> EDIT PROFILE
          </Button>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* COLUMN 1: PROFILE INFO */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Contact & Address Card */}
            <div className="bg-card rounded-xl shadow-sm p-4 border border-blue-100/30">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                <User className="h-3.5 w-3.5 text-primary" /> Contact Profile
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Email
                    </p>
                    <p className="text-xs font-semibold text-foreground">
                      {customer.email || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Phone
                    </p>
                    <p className="text-xs font-semibold text-foreground">
                      {customer.phone || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Address
                    </p>
                    <p className="text-xs font-semibold text-foreground leading-relaxed">
                      {customer.address || 'N/A'}
                    </p>
                    {(customer.stateProvince || customer.city) && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {[customer.city, customer.stateProvince].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                {customer.country && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Country
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {isoToFlag(customer.country)} {customer.country}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business & Tax Card */}
            <div className="bg-card rounded-xl shadow-sm p-4 border border-blue-100/30">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Business & Tax
              </h3>
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
                  VAT Number
                </p>
                <p className="text-sm font-bold text-primary">{customer.vatNumber || 'N/A'}</p>
              </div>
            </div>

            {/* Bank Accounts Card */}
            <div className="bg-card rounded-xl shadow-sm p-4 border border-blue-100/30">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                <Landmark className="h-3.5 w-3.5 text-primary" /> Bank Accounts
                <span className="ml-auto text-[10px] font-normal text-gray-400 normal-case">
                  {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
                </span>
              </h3>
              {bankAccounts.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  No bank accounts on file. Edit customer to add.
                </p>
              ) : (
                <div className="space-y-2">
                  {bankAccounts.map((acc, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border ${acc.isPrimary ? 'border-blue-300 bg-blue-50/60' : 'border-gray-100 bg-gray-50/40'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground">{acc.bankName}</span>
                        {acc.isPrimary && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">{acc.accountHolderName}</p>
                      <p className="text-[11px] font-mono font-semibold text-gray-700 mt-0.5">
                        {acc.accountNumber}
                      </p>
                      {(acc.swiftCode || acc.iban || acc.address || acc.routingNumber) && (
                        <div className="flex flex-wrap gap-x-3 mt-1">
                          {acc.swiftCode && (
                            <span className="text-[10px] text-gray-400">
                              SWIFT:{' '}
                              <span className="font-mono text-gray-600">{acc.swiftCode}</span>
                            </span>
                          )}
                          {acc.iban && (
                            <span className="text-[10px] text-gray-400">
                              {getBankCodeLabel(acc.bankCountry)}:{' '}
                              <span className="font-mono text-gray-600">{acc.iban}</span>
                            </span>
                          )}
                          {acc.address && (
                            <span className="text-[10px] text-gray-400">
                              Address: <span className="text-gray-600">{acc.address}</span>
                            </span>
                          )}
                          {acc.routingNumber && (
                            <span className="text-[10px] text-gray-400">
                              Routing:{' '}
                              <span className="font-mono text-gray-600">{acc.routingNumber}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2 & 3: MACHINES + HISTORY */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Assigned Machines Card */}
            {(() => {
              const machines: MachineAllocation[] = [
                ...getRentedMachines(history, models),
                ...getLeasedMachines(history, models),
                ...getPurchasedMachines(history, models),
                ...getContractMachines(history, models),
                ...getExternalMachines(history, activeContracts),
              ];
              const typeBadgeClass: Record<string, string> = {
                RENT: 'bg-blue-100 text-blue-700',
                LEASE: 'bg-purple-100 text-purple-700',
                SALE: 'bg-emerald-100 text-emerald-700',
                AMC: 'bg-indigo-100 text-indigo-700',
                FSMA: 'bg-indigo-100 text-indigo-700',
                SMA: 'bg-indigo-100 text-indigo-700',
                EXTERNAL: 'bg-slate-200 text-slate-600',
              };
              return (
                <div className="bg-card rounded-xl shadow-sm p-4 border border-blue-100/30">
                  <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                    <Wrench className="h-3.5 w-3.5 text-primary" /> Assigned Machines
                    <span className="ml-auto text-[10px] font-normal text-gray-400 normal-case">
                      {machines.length} machine{machines.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  {machines.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      No machines assigned to this customer.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {machines.map((m, idx) => {
                        const showWarranty = m.type === 'LEASE' || m.type === 'SALE';
                        const showContractDate =
                          ['RENT', 'AMC', 'FSMA', 'SMA'].includes(m.type) ||
                          (m.type === 'EXTERNAL' && !!m.contractType);
                        return (
                          <div
                            key={`${m.type}-${m.id}-${idx}`}
                            className="p-3 rounded-xl border border-gray-100 bg-gray-50/40 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-foreground truncate">
                                  {m.brandName ? `${m.brandName} — ` : ''}
                                  {m.modelName}
                                </p>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                                    typeBadgeClass[m.type] || 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {m.type === 'EXTERNAL' && m.contractType
                                    ? `EXTERNAL · ${m.contractType}`
                                    : m.type}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-gray-500">
                                SN: {m.serialNumber}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {showWarranty && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    m.isUnderWarranty
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {m.isUnderWarranty ? m.remainingTime : 'Warranty Expired'}
                                </span>
                              )}
                              {!showWarranty && showContractDate && m.effectiveTo && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                  Until {new Date(m.effectiveTo).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ServiceTicketHistoryPanel tickets={history?.tickets} />
              <BillingHistoryPanel
                billingHistory={history?.billingHistory}
                tickets={history?.tickets}
              />
            </div>
          </div>
        </div>
      </div>

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={customer}
        onSubmit={handleFormSubmit}
      />
    </ProtectedRoute>
  );
}
