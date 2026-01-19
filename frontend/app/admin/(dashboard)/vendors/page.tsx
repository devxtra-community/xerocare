'use client';

import React, { useEffect, useState } from 'react';
import VendorStats from '@/components/AdminDashboardComponents/VendorComponents/VendorStats';
import VendorTable, {
  Vendor as UiVendor,
} from '@/components/AdminDashboardComponents/VendorComponents/VendorTable';
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = v as any;
        return {
          id: v.id,
          name: v.name,
          type: raw.type || 'Supplier', // Mock or default
          contactPerson: raw.contactPerson || 'N/A', // Mock or default
          phone: v.phone || 'N/A',
          email: v.email || 'N/A',
          totalOrders: raw.totalOrders || 0, // Mock
          purchaseValue: raw.purchaseValue || 0, // Mock
          outstandingAmount: raw.outstandingAmount || 0, // Mock
          status: v.status === 'ACTIVE' ? 'Active' : 'On Hold',
        };
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

  // Calculate stats
  const totalVendors = apiVendors.length;
  const activeVendors = apiVendors.filter((v) => v.status === 'ACTIVE').length;

  // New vendors (created in current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newVendors = apiVendors.filter((v) => {
    const created = new Date(v.createdAt);
    return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
  }).length;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10 bg-blue-100 min-h-screen">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Vendor Management</h2>
          <p className="text-sm text-slate-500">
            Manage suppliers, distributors, and service providers
          </p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <VendorStats
          totalVendors={totalVendors}
          activeVendors={activeVendors}
          newVendors={newVendors}
        />
        <VendorTable vendors={uiVendors} loading={loading} onRefresh={fetchVendorsData} />
      </div>
    </div>
  );
}
