"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Mail, Phone, MapPin, Building2, User, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Mock Data - In a real app, fetch using 'id'
  const vendor = {
    id: "1",
    name: "ABC Supplies",
    type: "Supplier",
    contactPerson: "John Doe",
    phone: "+91 9876543210",
    email: "john@abcsupplies.com",
    address: "123, Industrial Area, Phase 1, New Delhi - 110020",
    gstin: "07AABCA1234A1Z5",
    status: "Active",
    totalOrders: 45,
    purchaseValue: 1200000,
    outstandingAmount: 50000,
    bankDetails: {
      accountName: "ABC Supplies Pvt Ltd",
      accountNumber: "123456789012",
      ifsc: "HDFC0001234",
      bankName: "HDFC Bank",
    },
  };

  return (
    <div className="p-6 space-y-6 bg-blue-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900 font-serif flex items-center gap-3">
              {vendor.name}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${vendor.status === "Active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {vendor.status}
              </span>
            </h2>
            <p className="text-sm text-slate-500">Vendor ID: #{id} • {vendor.type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 bg-white">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" className="gap-2 bg-blue-900 text-white hover:bg-blue-800">
             <Edit className="h-4 w-4" /> Edit Vendor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: General Information */}
        <Card className="rounded-2xl border-none shadow-sm h-full">
            <CardHeader className="bg-white rounded-t-2xl border-b border-gray-100 pb-4">
               <CardTitle className="text-base text-blue-900 font-bold flex items-center gap-2">
                    <User className="h-4 w-4" /> General Information
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Contact Person</div>
                        <div className="text-sm font-medium text-slate-800">{vendor.contactPerson}</div>
                    </div>
                     <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Vendor Type</div>
                        <div className="text-sm font-medium text-slate-800">{vendor.type}</div>
                    </div>
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Phone Number</div>
                        <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                            <Phone className="h-3 w-3 text-slate-400" /> {vendor.phone}
                        </div>
                    </div>
                     <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Email Address</div>
                        <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                            <Mail className="h-3 w-3 text-slate-400" /> {vendor.email}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Office Address</div>
                    <div className="text-sm font-medium text-slate-800 flex items-start gap-2">
                        <MapPin className="h-3 w-3 text-slate-400 mt-0.5" />
                        {vendor.address}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Card 2: Business & Financials */}
         <Card className="rounded-2xl border-none shadow-sm h-full">
            <CardHeader className="bg-white rounded-t-2xl border-b border-gray-100 pb-4">
               <CardTitle className="text-base text-blue-900 font-bold flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Business Details
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                 <div>
                    <div className="text-xs text-slate-400 uppercase font-semibold mb-1">GSTIN</div>
                    <div className="text-sm font-medium text-slate-800">{vendor.gstin}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Bank Name</div>
                        <div className="text-sm font-medium text-slate-800">{vendor.bankDetails.bankName}</div>
                    </div>
                     <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Account Number</div>
                        <div className="text-sm font-medium text-slate-800">{vendor.bankDetails.accountNumber}</div>
                    </div>
                </div>
                 <div>
                    <div className="text-xs text-slate-400 uppercase font-semibold mb-1">IFSC Code</div>
                    <div className="text-sm font-medium text-slate-800">{vendor.bankDetails.ifsc}</div>
                </div>

                <div className="pt-4 mt-2 border-t border-dashed border-gray-200">
                    <div className="flex justify-between items-center">
                         <div className="text-sm text-slate-500">Outstanding Balance</div>
                         <div className="text-lg font-bold text-red-600">₹ {vendor.outstandingAmount.toLocaleString()}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
