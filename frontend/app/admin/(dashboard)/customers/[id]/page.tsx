'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { getCustomerById } from '@/lib/customer';
import { getCustomer360Profile, getLeadByCustomerId } from '@/lib/customer360';
import { getEmployeeById, Employee } from '@/lib/employee';
import type { Customer } from '@/lib/customer';
import type { Lead } from '@/lib/lead';
import type { Customer360Profile } from '@/lib/customer360';
import Customer360View from '@/components/customer360/Customer360View';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';

function Customer360Content() {
  const params = useParams();
  const searchParams = useSearchParams();
  const customerId = params.id as string;
  const branchIds = searchParams.get('branchIds') ?? '';
  const branchIdList = branchIds ? branchIds.split(',').filter(Boolean) : [];

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<Customer360Profile | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [createdByEmployee, setCreatedByEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!customerId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    Promise.all([
      getCustomerById(customerId),
      getCustomer360Profile(customerId, branchIdList.length > 0 ? branchIdList : undefined),
      getLeadByCustomerId(customerId).catch(() => null),
    ])
      .then(async ([customerData, profileData, leadData]) => {
        if (cancelled) return;
        setCustomer(customerData);
        setProfile(profileData);
        setLead(leadData);

        if (customerData.createdBy) {
          getEmployeeById(customerData.createdBy)
            .then((res) => {
              if (!cancelled) setCreatedByEmployee(res?.data ?? null);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          console.warn('Failed to load customer 360 profile:', err);
          setError('Failed to load customer profile. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, branchIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="font-medium">Loading customer profile…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <AlertCircle className="h-10 w-10 text-slate-300" />
          <div className="text-center">
            <p className="font-semibold text-slate-700 text-lg">Customer not found</p>
            <p className="text-sm text-slate-400 mt-1">
              This customer may have been deleted or the link is invalid.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/customers')}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  if (error || !customer || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="font-medium">{error ?? 'Customer not found'}</p>
          <button
            onClick={() => router.push('/admin/customers')}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const createdByName = createdByEmployee
    ? [createdByEmployee.first_name, createdByEmployee.last_name].filter(Boolean).join(' ') ||
      createdByEmployee.email
    : undefined;

  return (
    <div>
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <BranchFilterBar />
      </div>
      <Customer360View
        customer={customer}
        profile={profile}
        lead={lead}
        createdByName={createdByName}
        createdByRole={createdByEmployee?.role}
        backHref="/admin/customers"
      />
    </div>
  );
}

export default function AdminCustomer360Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <Customer360Content />
    </Suspense>
  );
}
