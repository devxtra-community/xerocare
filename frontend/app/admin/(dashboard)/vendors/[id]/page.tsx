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
  TrendingUp,
  Clock,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import VendorTransactionsTable from '@/components/AdminDahboardComponents/vendorComponents/VendorTransactionsTable';
import VendorSpendingTrend from '@/components/AdminDahboardComponents/vendorComponents/VendorSpendingTrend';

export default function Page({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;

  const vendor = {
    id: id || '1',
    name: 'ABC Supplies Pvt Ltd',
    type: 'Primary Supplier',
    contactPerson: 'John Doe',
    phone: '+91 9876543210',
    email: 'john@abcsupplies.com',
    address: '123, Industrial Area, Phase 1, New Delhi - 110020',
    gstin: '07AABCA1234A1Z5',
    status: 'Active',
    totalOrders: 45,
    purchaseValue: 1200000,
    outstandingAmount: 50000,
    creditLimit: 500000,
    bankDetails: {
      accountName: 'ABC Supplies Pvt Ltd',
      accountNumber: '123456789012',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
    },
  };

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
              <ArrowLeft className="h-5 w-5 text-blue-900" />
            </Button>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-blue-900 flex items-center gap-2 uppercase">
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
            >
              <Edit className="h-3.5 w-3.5" /> EDIT PROFILE
            </Button>
          </div>
        </div>

        {/* FINANCIAL SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          <StatCard
            title="Total Spend"
            value={`₹${(vendor.purchaseValue / 100000).toFixed(1)}L`}
            subtitle="Lifetime Purchase"
          />
          <StatCard
            title="Total Orders"
            value={vendor.totalOrders.toString()}
            subtitle="Successful Deliveries"
          />
          <StatCard
            title="Outstanding"
            value={`₹${(vendor.outstandingAmount / 1000).toFixed(0)}K`}
            subtitle="Pending Payments"
          />
          <StatCard
            title="Credit Limit"
            value={`₹${(vendor.creditLimit / 100000).toFixed(1)}L`}
            subtitle="Available: ₹4.5L"
          />
        </div>

        {/* MAIN CONTENT: INFO + TRANSACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* COLUMN 1: VENDOR INFO */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* General Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100/30 flex-1 flex flex-col">
              <h3 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
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
                    <p className="text-xs font-semibold text-gray-900">{vendor.contactPerson}</p>
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
                    <p className="text-xs font-semibold text-gray-900">{vendor.phone}</p>
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
                    <p className="text-xs font-semibold text-gray-900">{vendor.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Location
                    </p>
                    <p className="text-xs font-semibold text-gray-900 leading-relaxed">
                      {vendor.address}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Details Card */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100/30 flex-1 flex flex-col">
              <h3 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Business & Tax
              </h3>
              <div className="space-y-4 flex-1">
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                  <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
                    GSTIN Number
                  </p>
                  <p className="text-sm font-bold text-blue-900">{vendor.gstin}</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Bank Name
                    </p>
                    <p className="text-xs font-semibold text-gray-900">
                      {vendor.bankDetails.bankName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Account / IFSC
                    </p>
                    <p className="text-xs font-mono font-semibold text-gray-900 break-all">
                      {vendor.bankDetails.accountNumber} / {vendor.bankDetails.ifsc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2 & 3: TRANSACTION HISTORY */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-blue-100/30 h-full flex flex-col overflow-hidden text-blue-900 uppercase">
              <h3 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2 p-4 border-b border-gray-50 flex-none bg-white">
                <Clock className="h-3.5 w-3.5 text-primary" /> Transaction History
              </h3>
              <div className="flex-1 overflow-auto">
                <VendorTransactionsTable />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: ANALYTICS */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-blue-900 uppercase flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Purchasing Analytics
          </h3>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100/30">
            <div className="h-[320px]">
              <VendorSpendingTrend />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
