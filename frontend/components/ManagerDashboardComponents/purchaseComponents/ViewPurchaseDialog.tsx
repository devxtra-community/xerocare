'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Purchase } from '@/services/purchaseService';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Calendar,
  User,
  CreditCard,
  ArrowRight,
  Boxes,
  Truck,
  FileCheck,
  Users,
  Globe,
  Wrench,
  Package,
  Calculator,
  Building2,
} from 'lucide-react';

interface ViewPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
}

/**
 * Dialog component for viewing detailed purchase information.
 * Read-only view showing all purchase attributes including associated costs and status.
 */
export default function ViewPurchaseDialog({
  open,
  onOpenChange,
  purchase,
}: ViewPurchaseDialogProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-white">Purchase Summary</DialogTitle>
            <DialogDescription className="text-white/70 text-sm">
              Financial record overview for Purchase #{purchase.id.slice(0, 8)}
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 space-y-8 bg-white overflow-y-auto max-h-[85vh]">
          {/* Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 italic">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Total Lot Amount
              </p>
              <p className="text-xl font-black text-primary">
                {formatCurrency(purchase.totalAmount)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 italic">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Payment Status
              </p>
              <Badge
                className={`mt-1 border shadow-none px-3 font-semibold ${getStatusStyle(purchase.status)}`}
              >
                {purchase.status}
              </Badge>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 italic">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Creation Date
              </p>
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {new Date(purchase.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Context Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">
                Record Context
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <Boxes className="h-4 w-4" />
                    Lot Association
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {purchase.lotId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Vendor Account
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {purchase.vendorId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Branch ID
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {purchase.branchId.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">
                Financial Breakdown
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Purchase Amount
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatCurrency(purchase.purchaseAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Additional Costs
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {formatCurrency(purchase.totalAmount - purchase.purchaseAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Costs */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Detailed Costs Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <CostItem icon={FileCheck} label="Docs Fee" value={purchase.documentationFee} />
              <CostItem icon={Users} label="Labour" value={purchase.labourCost} />
              <CostItem icon={Package} label="Handling" value={purchase.handlingFee} />
              <CostItem icon={Truck} label="Transport" value={purchase.transportationCost} />
              <CostItem icon={Globe} label="Shipping" value={purchase.shippingCost} />
              <CostItem icon={Wrench} label="Groundfield" value={purchase.groundfieldCost} />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              className="px-8 h-11 font-bold italic"
              onClick={() => onOpenChange(false)}
            >
              Close Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { LucideIcon } from 'lucide-react';

function CostItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="p-3 rounded-lg bg-slate-50/50 border border-slate-100 italic transition-all hover:bg-white hover:shadow-sm hover:border-slate-200">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3 w-3 text-slate-400" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-700">{formatCurrency(value)}</p>
    </div>
  );
}
