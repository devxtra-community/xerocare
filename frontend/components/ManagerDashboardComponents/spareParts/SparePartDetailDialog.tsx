'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  Package,
  Warehouse,
  User,
  Activity,
  Copy,
  Check,
  Building2,
  Box,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { SparePartInventoryItem } from '@/services/sparePartService';

interface SparePartDetailDialogProps {
  part: SparePartInventoryItem;
  onClose: () => void;
}

export default function SparePartDetailDialog({ part, onClose }: SparePartDetailDialogProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLot, setCopiedLot] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(part.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLot = () => {
    navigator.clipboard.writeText(part.lotNumber);
    setCopiedLot(true);
    setTimeout(() => setCopiedLot(false), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white shadow-2xl rounded-2xl border-none">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Settings size={32} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-transparent text-[10px] font-bold tracking-wider uppercase">
                  {part.brand}
                </Badge>
                <Badge className="bg-green-500/20 text-green-100 border-transparent text-[10px] font-bold tracking-wider uppercase">
                  IN STOCK
                </Badge>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{part.part_name}</h2>
              <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
                <Package size={14} />
                Item Code: {part.item_code}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <StatItem
              icon={<Activity className="text-primary" size={18} />}
              label="Available Qty"
              value={part.quantity.toString()}
              subValue="Units"
            />
            <StatItem
              icon={<Activity className="text-green-600" size={18} />}
              label="Unit Price"
              value={formatCurrency(part.price)}
              subValue="QAR"
            />
            <StatItem
              icon={<Building2 className="text-orange-500" size={18} />}
              label="Branch"
              value={part.branch_name || 'N/A'}
              subValue="Inventory Location"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            {/* Primary Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Primary Details
              </h3>

              <InfoBlock
                icon={<Box className="text-slate-400" size={16} />}
                label="Lot ID"
                value={part.lotNumber}
                onCopy={handleCopyLot}
                copied={copiedLot}
              />

              <InfoBlock
                icon={<Warehouse className="text-slate-400" size={16} />}
                label="Warehouse"
                value={part.warehouse_name}
              />

              <InfoBlock
                icon={<User className="text-slate-400" size={16} />}
                label="Vendor"
                value={part.vendor_name || 'N/A'}
              />
            </div>

            {/* Technical Specifications */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Specifications
              </h3>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Compatible Models
                  </label>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                    {part.compatible_model || 'Universal / Multiple Models'}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    System Identifier
                  </label>
                  <div className="flex items-center gap-2 group">
                    <code className="text-[11px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 flex-1 truncate">
                      {part.id}
                    </code>
                    <button
                      onClick={handleCopyId}
                      className="text-slate-400 hover:text-primary transition-colors p-1"
                      title="Copy ID"
                    >
                      {copiedId ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end items-center gap-3 border-t overflow-hidden">
          <Button variant="outline" className="rounded-full px-6" onClick={onClose}>
            Close
          </Button>
          <Button className="bg-primary text-white rounded-full px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
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
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 group">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform duration-300">
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
