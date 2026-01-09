'use client';

import React, { useEffect, useState } from 'react';
import VendorStats from '@/components/AdminDahboardComponents/VendorComponents/VendorStats'; // Reusing stats layout
import VendorTable, {
  Vendor as UiVendor,
} from '@/components/AdminDahboardComponents/VendorComponents/VendorTable';
import { getVendors, Vendor as ApiVendor } from '@/lib/vendor';
import { toast } from 'sonner';

export default function VendorsPage() {
  const [loading, setLoading] = useState(true);
  const [apiVendors, setApiVendors] = useState<ApiVendor[]>([]);
  const [uiVendors, setUiVendors] = useState<UiVendor[]>([]);

  const fetchVendorsData = async () => {
    setLoading(true);
    try {
      const res = await getVendors();
      const rawVendors: ApiVendor[] = res.data || [];

      setApiVendors(rawVendors);

      // Map to UI model
      const mappedVendors: UiVendor[] = rawVendors.map((v) => {
        return {
          id: v.id,
          name: v.name,
          type: v.type || 'Supplier',
          contactPerson: v.contactPerson || 'N/A',
          phone: v.phone || 'N/A',
          email: v.email || 'N/A',
          totalOrders: v.totalOrders || 0,
          purchaseValue: v.purchaseValue || 0,
          outstandingAmount: v.outstandingAmount || 0,
          status: v.status === 'ACTIVE' ? 'Active' : 'On Hold',
        } as UiVendor;
      });

      setUiVendors(mappedVendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorsData();
  }, []);

  // Calculate live stats
  const totalVendors = apiVendors.length;
  const activeVendors = apiVendors.filter((v) => v.status === 'ACTIVE').length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newVendors = apiVendors.filter((v) => {
    const created = new Date(v.createdAt);
    return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
  }).length;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10 bg-blue-100 min-h-screen">
      <div className="flex justify-between items-center px-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Vendor Management
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage suppliers, distributors, and service providers
          </p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="px-4">
          <VendorStats
            totalVendors={totalVendors}
            activeVendors={activeVendors}
            newVendors={newVendors}
          />
        </div>

        <VendorTable
          vendors={uiVendors}
          loading={loading}
          onRefresh={fetchVendorsData}
          basePath="/manager"
        />
      </div>
    </div>
  );
}
