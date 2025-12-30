"use client";

import React from "react";
import VendorStats from "@/components/AdminComponents/VendorComponents/VendorStats";
import VendorTable from "@/components/AdminComponents/VendorComponents/VendorTable";

export default function VendorsPage() {
  return (
    <div className="p-6 space-y-6 bg-blue-100 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-blue-900 font-serif">Vendor Management</h2>
           <p className="text-sm text-slate-500">Manage suppliers, distributors, and service providers</p>
        </div>
      </div>

      <VendorStats />
      
      <VendorTable />
    </div>
  );
}
