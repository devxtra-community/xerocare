'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Printer,
  Edit,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Clock,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import VendorTransactionsTable from '@/components/AdminDahboardComponents/VendorComponents/VendorTransactionsTable';
import {
  getVendorById,
  getVendorRequests,
  updateVendor,
  Vendor as ApiVendor,
  BankAccount as ApiBankAccount,
  VendorRequest,
} from '@/lib/vendor';
import { toast } from 'sonner';
import { Globe, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import {
  VendorFormModal,
  type VendorFormData,
  type Vendor as VendorFormVendor,
} from '@/components/AdminDahboardComponents/VendorComponents/VendorTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getBankCodeLabel } from '@/lib/bankCodeType';

import { getActiveCurrency } from '@/lib/currency';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [vendor, setVendor] = React.useState<ApiVendor | null>(null);
  const [requests, setRequests] = React.useState<VendorRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [requestsLoading, setRequestsLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [viewAccount, setViewAccount] = React.useState<ApiBankAccount | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const vendorRes = await getVendorById(id);
      if (vendorRes.success) {
        setVendor(vendorRes.data);
      } else {
        toast.error('Failed to load vendor details');
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
      toast.error('Error loading vendor details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    const fetchRequests = async () => {
      try {
        setRequestsLoading(true);
        const res = await getVendorRequests(id);
        if (res.success) {
          setRequests(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch requests', error);
      } finally {
        setRequestsLoading(false);
      }
    };

    if (id) {
      fetchData();
      fetchRequests();
    }
  }, [id, fetchData]);

  const handleSave = async (data: VendorFormData) => {
    try {
      await updateVendor(id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        contactPerson: data.contactPerson,
        status: data.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
        currency: data.currency,
        countryCode: data.countryCode || undefined,
        countryName: data.countryName || undefined,
        stateProvince: data.stateProvince || undefined,
        city: data.city || undefined,
        vatNumber: data.vatNumber || undefined,
        bankAccounts: data.bankAccounts || [],
        branchId: data.branchId || null,
      });
      toast.success('Vendor profile updated');
      setFormOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to update vendor:', error);
      toast.error('Failed to update vendor profile');
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-100 min-h-screen flex items-center justify-center">
        <div className="text-primary font-bold animate-pulse">Loading Vendor Details...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="bg-blue-100 min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-primary font-bold">Vendor not found</div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const currency = vendor.currency || getActiveCurrency();
  const bankAccounts = vendor.bankAccounts || [];

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* HEADER SECTION */}
      <div className="space-y-3">
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
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-primary flex items-center gap-2 uppercase">
                VENDOR DETAIL
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700 uppercase font-bold">
                  {vendor.status}
                </span>
              </h3>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                ID: #{vendor.id} • {vendor.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px] rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5 font-semibold"
            >
              <Printer className="h-3.5 w-3.5" /> PRINT
            </Button>
            <Button
              size="sm"
              className="h-8 text-[11px] rounded-lg bg-primary hover:bg-primary/90 text-white gap-1.5 font-semibold"
              onClick={() => setFormOpen(true)}
            >
              <Edit className="h-3.5 w-3.5" /> EDIT PROFILE
            </Button>
          </div>
        </div>

        {/* FINANCIAL SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-4 max-w-2xl">
          <StatCard
            title="Total Spend"
            value={formatCurrency(vendor.purchaseValue || 0, currency)}
            subtitle="Lifetime Purchase"
          />
          <StatCard
            title="Total Orders"
            value={(vendor.totalOrders || 0).toString()}
            subtitle="Successful Deliveries"
          />
        </div>

        {/* MAIN CONTENT: INFO + TRANSACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* COLUMN 1: VENDOR INFO */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* General Info Card */}
            <div className="bg-card rounded-xl shadow-sm p-4 border border-blue-100/30 flex-1 flex flex-col">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                <User className="h-3.5 w-3.5 text-primary" /> Contact Profile
              </h3>
              <div className="space-y-4 flex-1">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Contact Person
                    </p>
                    <p className="text-xs font-semibold text-foreground">{vendor.contactPerson}</p>
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
                    <p className="text-xs font-semibold text-foreground">{vendor.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Email
                    </p>
                    <p className="text-xs font-semibold text-foreground">{vendor.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Vendor Address
                    </p>
                    <p className="text-xs font-semibold text-foreground leading-relaxed">
                      {vendor.address || 'N/A'}
                    </p>
                  </div>
                </div>
                {vendor.countryName && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Country
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {vendor.countryName}
                        {vendor.countryCode && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-mono">
                            {vendor.countryCode}
                          </span>
                        )}
                      </p>
                      {currency && (
                        <p className="text-[10px] text-blue-500 font-semibold mt-0.5">
                          Currency: {currency}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Details Card */}
            <div className="bg-card rounded-xl shadow-sm p-4 border border-blue-100/30 flex flex-col">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Business & Tax
              </h3>
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
                  GSTIN Number
                </p>
                <p className="text-sm font-bold text-primary">{vendor.gstin || 'N/A'}</p>
              </div>
            </div>

            {/* Bank Accounts Card */}
            <div className="bg-card rounded-xl shadow-sm p-4 border border-blue-100/30 flex flex-col">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                <Landmark className="h-3.5 w-3.5 text-primary" /> Bank Accounts
                <span className="ml-auto text-[10px] font-normal text-gray-400 normal-case">
                  {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
                </span>
              </h3>
              {bankAccounts.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  No bank accounts on file. Edit vendor to add.
                </p>
              ) : (
                <div className="space-y-2">
                  {bankAccounts.map((acc, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setViewAccount(acc)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors hover:border-blue-300 ${acc.isPrimary ? 'border-blue-300 bg-blue-50/60' : 'border-gray-100 bg-gray-50/40'}`}
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
                      <p className="text-[10px] text-blue-500 font-semibold mt-1">
                        View full details →
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2 & 3: TRANSACTION HISTORY */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl shadow-sm border border-blue-100/30 h-full flex flex-col overflow-hidden text-primary uppercase">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 p-4 border-b border-gray-50 flex-none bg-card">
                <Clock className="h-3.5 w-3.5 text-primary" /> Transaction History
              </h3>
              <div className="flex-1 overflow-auto">
                <VendorTransactionsTable requests={requests} loading={requestsLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <VendorFormModal
        initialData={
          {
            id: vendor.id,
            name: vendor.name,
            contactPerson: vendor.contactPerson || '',
            phone: vendor.phone,
            email: vendor.email,
            totalOrders: vendor.totalOrders || 0,
            purchaseValue: vendor.purchaseValue || 0,
            outstandingAmount: vendor.outstandingAmount || 0,
            status: vendor.status === 'ACTIVE' ? 'Active' : 'On Hold',
            currency: vendor.currency || getActiveCurrency(),
            countryCode: vendor.countryCode,
            countryName: vendor.countryName,
            stateProvince: vendor.stateProvince,
            city: vendor.city,
            bankAccounts: vendor.bankAccounts || [],
            branchId: vendor.branchId ?? undefined,
            branchName: vendor.branch?.name,
            vatNumber: vendor.vatNumber,
          } as VendorFormVendor
        }
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onConfirm={handleSave}
        isAdmin={true}
      />

      <Dialog open={!!viewAccount} onOpenChange={(o) => !o && setViewAccount(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Bank Account Details</DialogTitle>
          </DialogHeader>
          {viewAccount && (
            <div className="space-y-3 text-sm">
              {viewAccount.isPrimary && (
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                  Primary Account
                </span>
              )}
              {[
                ['Bank Name', viewAccount.bankName],
                ['Account Holder', viewAccount.accountHolderName],
                ['Account Number', viewAccount.accountNumber],
                ['Account Type', viewAccount.accountType],
                ['Branch', viewAccount.branch],
                [getBankCodeLabel(viewAccount.bankCountry), viewAccount.iban],
                ['SWIFT / BIC', viewAccount.swiftCode],
                ['Routing Number', viewAccount.routingNumber],
                ['Bank Address', viewAccount.address],
                ['Currency', viewAccount.currency],
              ]
                .filter(([, value]) => !!value)
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-gray-50 pb-2"
                  >
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      {label}
                    </span>
                    <span className="text-xs font-semibold font-mono text-foreground text-right">
                      {value}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
