'use client';

import React, { useState } from 'react';
import {
  Settings,
  Package,
  Warehouse,
  User,
  Activity,
  Copy,
  Check,
  Building2,
  Box,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { SparePartInventoryItem } from '@/services/sparePartService';

interface SparePartDetailDialogProps {
  part: SparePartInventoryItem;
  onClose: () => void;
  onEdit: () => void;
}

export default function SparePartDetailDialog({
  part,
  onClose,
  onEdit,
}: SparePartDetailDialogProps) {
  const [copiedLot, setCopiedLot] = useState(false);

  const handleCopyLot = () => {
    navigator.clipboard.writeText(part.lotNumber);
    setCopiedLot(true);
    setTimeout(() => setCopiedLot(false), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg p-0 overflow-hidden bg-white shadow-2xl rounded-2xl border-none"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{part.part_name} Details</DialogTitle>
          <DialogDescription>
            Detailed information about spare part {part.sku || part.part_name} from lot{' '}
            {part.lotNumber}
          </DialogDescription>
        </DialogHeader>
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white relative">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
              <Settings size={24} className="text-blue-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-transparent text-[10px] font-bold tracking-wider uppercase">
                  {part.brand}
                </Badge>
                <Badge className="bg-green-500/20 text-green-100 border-transparent text-[10px] font-bold tracking-wider uppercase">
                  IN STOCK
                </Badge>
                {part.sku && (
                  <Badge className="bg-blue-500/20 text-blue-100 border-transparent text-[10px] font-bold tracking-wider uppercase">
                    SKU: {part.sku}
                  </Badge>
                )}
                {part.mpn && (
                  <Badge className="bg-amber-500/20 text-amber-100 border-transparent text-[10px] font-bold tracking-wider uppercase">
                    MPN: {part.mpn}
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{part.part_name}</h2>
              <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
                <Package size={14} />
                Lot: {part.lotNumber || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              icon={<Activity className="text-primary" size={18} />}
              label="Available Qty"
              value={part.quantity.toString()}
              subValue="Units"
            />
            {/* Prices */}
            <StatItem
              icon={<DollarSign className="text-emerald-600" size={18} />}
              label="Selling Price"
              value={formatCurrency(part.price || 0)}
              subValue="Retail"
            />
            <StatItem
              icon={<TrendingUp className="text-blue-600" size={18} />}
              label="Wholesale Price"
              value={formatCurrency(part.wholesale_price || 0)}
              subValue="Bulk"
            />
            <StatItem
              icon={<Building2 className="text-orange-500" size={18} />}
              label="Branch"
              value={part.branch_name || 'N/A'}
              subValue="Inventory Location"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-0">
            {/* Primary Details */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Primary Details
              </h3>

              <div className="bg-slate-50/50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                <InfoBlock
                  icon={<Box className="text-slate-400" size={14} />}
                  label="Lot ID"
                  value={part.lotNumber}
                  onCopy={handleCopyLot}
                  copied={copiedLot}
                />

                <InfoBlock
                  icon={<Warehouse className="text-slate-400" size={14} />}
                  label="Warehouse"
                  value={part.warehouse_name}
                />

                <InfoBlock
                  icon={<User className="text-slate-400" size={14} />}
                  label="Vendor"
                  value={part.vendor_name || 'N/A'}
                />
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Specifications
              </h3>

              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Compatible Models
                  </label>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                    {part.compatible_model || 'Universal / Multiple Models'}
                  </p>
                </div>
                {part.mpn && (
                  <div className="pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Manufacturing Part Number (MPN)
                    </label>
                    <p className="text-sm font-mono font-bold text-blue-600">{part.mpn}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description Section */}
            {part.description && (
              <div className="space-y-3 col-span-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Product Description
                </h3>
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {part.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-white px-6 py-4 flex justify-end items-center gap-3 border-t">
          <Button
            variant="ghost"
            className="rounded-xl px-6 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-lg shadow-blue-200 font-bold"
            onClick={onEdit}
          >
            Edit Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatItem({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 group">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1.5 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-slate-800 tracking-tight">{value}</span>
        <span className="text-[10px] font-bold text-slate-400">{subValue}</span>
      </div>
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  onCopy,
  copied,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
      <div className="mt-1">{icon}</div>
      <div className="flex-1 min-w-0">
        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-700 truncate">{value || 'N/A'}</p>
          {onCopy && (
            <button
              onClick={onCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
