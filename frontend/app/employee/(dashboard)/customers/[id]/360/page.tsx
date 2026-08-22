'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { getCustomerById } from '@/lib/customer';
import { getMyCustomer360Profile, getLeadByCustomerId } from '@/lib/customer360';
import { getEmployeeById, Employee } from '@/lib/employee';
import type { Customer } from '@/lib/customer';
import type { Lead } from '@/lib/lead';
import type { Customer360Profile } from '@/lib/customer360';
import Customer360View from '@/components/customer360/Customer360View';

/**
 * Employee-side Customer 360° Profile — personal-only. Reuses the exact same
 * Customer360View component as Manager/Admin; the only difference is the data source
 * (getMyCustomer360Profile, scoped to this employee's own transactions), the "back"
 * destination, and a scope notice so an employee doesn't mistake "nothing here" for
 * "customer has no history" when it may just mean "not personally handled by me".
 */
export default function EmployeeCustomer360Page() {
  const params = useParams();
  const customerId = params.id as string;

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
      getMyCustomer360Profile(customerId),
      getLeadByCustomerId(customerId).catch(() => null),
    ])
      .then(([customerData, profileData, leadData]) => {
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
  }, [customerId]);

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
            onClick={() => router.push('/employee/customers')}
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
          <p className="font-medium">{error ?? 'Something went wrong'}</p>
          <button
            onClick={() => router.push('/employee/customers')}
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
    <Customer360View
      customer={customer}
      profile={profile}
      lead={lead}
      createdByName={createdByName}
      createdByRole={createdByEmployee?.role}
      scopeNotice="Personal view — showing only quotations, contracts, bills, and payments you personally created or handled for this customer."
      backHref="/employee/customers"
    />
  );
}
