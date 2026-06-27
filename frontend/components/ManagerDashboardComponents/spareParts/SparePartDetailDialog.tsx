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
  X,
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
import Barcode from 'react-barcode';

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
        className="sm:max-w-4xl w-[95vw] p-0 overflow-hidden bg-white shadow-2xl rounded-2xl border-none border-t-4 border-blue-600"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{part.part_name} Details</DialogTitle>
          <DialogDescription>
            Detailed information about spare part {part.sku || part.part_name} from lot{' '}
            {part.lotNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Header (styled like Lots view) */}
        <div className="bg-white px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
              <Settings size={24} className="text-blue-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {part.part_name}
                </h2>
                <Badge className="bg-green-100 hover:bg-green-200 text-green-700 font-bold text-[10px] px-2 py-0.5 border-none">
                  IN STOCK
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Package size={14} className="text-slate-400" />
                  Lot: <span className="font-bold text-slate-700">{part.lotNumber || 'N/A'}</span>
                </span>
                {part.brand && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    Brand: <span className="font-bold text-slate-700">{part.brand}</span>
                  </span>
                )}
                {part.sku && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    SKU: <span className="font-mono font-bold text-slate-700">{part.sku}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-4 border-slate-200 text-slate-600 font-semibold text-xs gap-1.5 hover:bg-slate-50"
              onClick={onEdit}
            >
              <Settings size={14} />
              Edit Details
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-slate-400 hover:bg-slate-100"
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem
              icon={<Activity size={18} />}
              label="Available Qty"
              value={part.quantity.toString()}
              subValue="Units"
              iconBgClass="bg-blue-50"
              iconColorClass="text-blue-600"
            />
            {/* Prices */}
            <StatItem
              icon={<DollarSign size={18} />}
              label="Selling Price"
              value={formatCurrency(part.price || 0)}
              subValue="Retail"
              iconBgClass="bg-green-50"
              iconColorClass="text-green-600"
            />
            <StatItem
              icon={<TrendingUp size={18} />}
              label="Wholesale Price"
              value={formatCurrency(part.wholesale_price || 0)}
              subValue="Bulk"
              iconBgClass="bg-indigo-50"
              iconColorClass="text-indigo-600"
            />
            <StatItem
              icon={<Building2 size={18} />}
              label="Branch"
              value={part.branch_name || 'N/A'}
              subValue="Location"
              iconBgClass="bg-orange-50"
              iconColorClass="text-orange-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-0">
            {/* Left Column: Primary Details & Specifications */}
            <div className="space-y-6">
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
                  {part.yield && (
                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Yield / Life Specification
                      </label>
                      <p className="text-sm font-semibold text-emerald-700 leading-relaxed">
                        {part.yield}
                      </p>
                    </div>
                  )}
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
            </div>

            {/* Right Column: Description & Barcode */}
            <div className="space-y-6">
              {/* Description Section */}
              {part.description && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Product Description
                  </h3>
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-1.5">
                    {part.description.split('\n').map((line, i) => (
                      <p key={i} className="text-sm text-slate-600 leading-relaxed flex gap-2">
                        <span className="text-primary mt-1">➤</span>
                        <span>{line.trim()}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Barcode Display */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Spare Part Barcode
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col items-center justify-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-center w-full max-w-xs shadow-sm">
                    <Barcode
                      value={part.barcode_id || `XC-S-${part.sku}`}
                      width={1.5}
                      height={50}
                      fontSize={12}
                      margin={5}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-white px-6 py-3 flex justify-end items-center gap-3 border-t">
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
  iconBgClass = 'bg-slate-50',
  iconColorClass = 'text-slate-600',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  iconBgClass?: string;
  iconColorClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-2 rounded-lg ${iconBgClass} ${iconColorClass}`}>{icon}</div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1.5">
          {label}
        </p>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none text-slate-800 whitespace-nowrap">
            {value}
          </span>
          {subValue && (
            <span className="text-[10px] font-medium text-slate-400 mt-1 leading-none">
              {subValue}
            </span>
          )}
        </div>
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
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
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
