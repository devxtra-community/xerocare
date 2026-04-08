'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Purchase } from '@/services/purchaseService';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  FileText,
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
  History,
  Plus,
} from 'lucide-react';
import AddPaymentModal from './AddPaymentModal';
import { useState } from 'react';

interface ViewPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
  onSuccess?: () => void;
}

/**
 * Dialog component for viewing detailed lot amount information.
 * Read-only view showing all lot amount attributes including associated costs and status.
 */
export default function ViewPurchaseDialog({
  open,
  onOpenChange,
  purchase,
  onSuccess,
}: ViewPurchaseDialogProps) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

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
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        <div className="bg-primary px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-white">Lot Amount Summary</DialogTitle>
            <DialogDescription className="text-white/70 text-sm">
              Financial record overview for Lot Amount #{purchase.id.slice(0, 8)}
            </DialogDescription>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="font-bold italic h-8"
              onClick={() => setPaymentModalOpen(true)}
              disabled={purchase.status === 'PAID'}
            >
              <Plus className="h-4 w-4 mr-1" /> Record Payment
            </Button>
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
                Balance Due
              </p>
              <p className="text-xl font-black text-red-600">
                {formatCurrency(purchase.remainingAmount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Context Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">
                Record Context
              </h4>
              <div className="space-y-6">
                <ContextItem
                  icon={Boxes}
                  label="Lot Reference"
                  value={purchase.lot?.lotNumber || purchase.lotId.slice(0, 8)}
                />
                <ContextItem
                  icon={User}
                  label="Vendor Account"
                  value={purchase.vendor?.name || purchase.vendorId.slice(0, 8)}
                />
                <ContextItem
                  icon={Building2}
                  label="Branch Origin"
                  value={purchase.branch?.name || purchase.branchId.slice(0, 8)}
                />
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
                    Lot Purchase Amount
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

          {/* Payment History Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History className="h-4 w-4" />
              Payment History
            </h4>
            {!purchase.payments || purchase.payments.length === 0 ? (
              <div className="p-8 text-center italic text-slate-400 border-2 border-dashed border-slate-100 rounded-xl text-sm">
                No payments have been recorded yet.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Date
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Method
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {purchase.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.paymentMethod}</td>
                        <td className="px-4 py-3 font-black text-slate-800 text-right">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

        <AddPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          purchaseId={purchase.id}
          totalAmount={purchase.totalAmount}
          paidAmount={purchase.paidAmount}
          onSuccess={() => {
            if (onSuccess) onSuccess();
            onOpenChange(false);
          }}
        />
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

interface ContextItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function ContextItem({ icon: Icon, label, value }: ContextItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2 rounded-lg bg-slate-50">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
          {label}
        </p>
        <p className="text-xs font-bold text-slate-700 break-all">{value}</p>
      </div>
    </div>
  );
}
