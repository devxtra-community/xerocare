'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Printer,
  Edit,
  Package,
  Tag,
  BarChart3,
  Truck,
  ShieldCheck,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import Image from 'next/image';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Mock data for the product detail view
  const product = {
    id: id || '1',
    name: 'HP LaserJet Pro M404n',
    brand: 'HP',
    model: 'M404n',
    category: 'Printer',
    sku: 'PRN-HP-M404',
    serialNo: 'SN12345678',
    status: 'In Stock',
    quantity: 15,
    minStockLevel: 5,
    purchaseCost: 12000,
    sellingPrice: 15500,
    margin: '22.6%',
    warranty: '2026-12-31',
    vendor: 'HP India Pvt Ltd',
    location: 'Warehouse A - Section 4',
    mfd: '2024-05-10',
    description:
      'High-performance monochrome laser printer designed for business efficiency. Features fast printing speeds, robust security features, and reliable connectivity.',
    imageUrl:
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=2070&auto=format&fit=crop',
    specs: [
      { label: 'Print Speed', value: 'Up to 40 ppm' },
      { label: 'Connectivity', value: 'USB, Ethernet' },
      { label: 'Paper Capacity', value: '250 sheets' },
      { label: 'Duty Cycle', value: '80,000 pages' },
    ],
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
              <ArrowLeft className="h-5 w-5 text-primary" />
            </Button>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-primary flex items-center gap-2 uppercase">
                PRODUCT DETAIL
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                    product.status === 'In Stock'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {product.status}
                </span>
              </h3>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                SKU: {product.sku} • {product.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px] rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5 font-semibold"
            >
              <Printer className="h-3.5 w-3.5" /> PRINT LABEL
            </Button>
            <Button
              size="sm"
              className="h-8 text-[11px] rounded-lg bg-primary hover:bg-primary/90 text-white gap-1.5 font-semibold"
            >
              <Edit className="h-3.5 w-3.5" /> EDIT PRODUCT
            </Button>
          </div>
        </div>

        {/* FINANCIAL & STOCK SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <StatCard
            title="Current Stock"
            value={product.quantity.toString()}
            subtitle={`Min Level: ${product.minStockLevel}`}
          />
          <StatCard
            title="Purchase Cost"
            value={`₹${product.purchaseCost.toLocaleString()}`}
            subtitle="Last Purchase Price"
          />
          <StatCard
            title="Selling Price"
            value={`₹${product.sellingPrice.toLocaleString()}`}
            subtitle={`Margin: ${product.margin}`}
          />
          <StatCard
            title="Total Value"
            value={`₹${(product.quantity * product.purchaseCost).toLocaleString()}`}
            subtitle="Current Inventory Value"
          />
        </div>

        {/* MAIN CONTENT: IMAGE + INFO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* COLUMN 1: PRODUCT IMAGE & QUICK SPECS */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-blue-100/30">
              <div className="aspect-square relative flex items-center justify-center bg-gray-50">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100/30">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Warranty & MFD
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-gray-500 font-medium">Warranty Until</span>
                  </div>
                  <span className="text-xs font-bold text-primary">{product.warranty}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-gray-500 font-medium">MFD</span>
                  </div>
                  <span className="text-xs font-bold text-primary">{product.mfd}</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2 & 3: DETAILED INFO */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100/30 flex-1">
              <h3 className="text-xs font-bold text-primary uppercase flex items-center gap-2 border-b border-gray-50 pb-3 mb-6">
                <Info className="h-3.5 w-3.5 text-primary" /> General Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Tag className="h-3 w-3" /> Brand & Model
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {product.brand} / {product.model}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3 w-3" /> Category
                    </p>
                    <p className="text-sm font-bold text-primary">{product.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3" /> Serial Number
                    </p>
                    <p className="text-sm font-mono font-bold text-primary">{product.serialNo}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Truck className="h-3 w-3" /> Primary Vendor
                    </p>
                    <p className="text-sm font-bold text-primary">{product.vendor}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-3 w-3" /> Stock Location
                    </p>
                    <p className="text-sm font-bold text-primary">{product.location}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
