'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { purchaseService, Purchase } from '@/services/purchaseService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Banknote,
  Calendar,
  FileText,
  User,
  Building2,
  Boxes,
  Truck,
  FileCheck,
  Users,
  Globe,
  Wrench,
  Package,
  Calculator,
  History,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import AddPaymentModal from '@/components/ManagerDashboardComponents/purchaseComponents/AddPaymentModal';
import AddCostModal from '@/components/ManagerDashboardComponents/purchaseComponents/AddCostModal';

export default function PurchaseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [costModalOpen, setCostModalOpen] = useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await purchaseService.getPurchaseById(id as string);
      setPurchase(data);
    } catch (error) {
      toast.error('Failed to fetch purchase details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm italic">
        <p className="text-slate-500">Purchase record not found.</p>
        <Button variant="link" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

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
    <div className="p-4 sm:p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl bg-white"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight italic">
              Purchase Order #{purchase.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Lot: {purchase.lot?.lotNumber || purchase.lotId.slice(0, 8)} • Vendor:{' '}
              {purchase.vendor?.name || purchase.vendorId.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={`border shadow-none px-4 py-1.5 font-bold italic text-sm ${getStatusStyle(purchase.status)}`}
          >
            {purchase.status}
          </Badge>
          <Button
            className="bg-emerald-600 text-white font-bold italic px-6 rounded-xl shadow-lg hover:bg-emerald-700 hover:shadow-emerald-600/20"
            onClick={() => setCostModalOpen(true)}
          >
            <Banknote className="mr-2 h-4 w-4" /> Add Cost
          </Button>
          <Button
            disabled={purchase.status === 'PAID'}
            className="bg-primary text-white font-bold italic px-6 rounded-xl shadow-lg shadow-primary/20"
            onClick={() => setPaymentModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary and Breakdown */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
              label="Total Lot Value"
              value={formatCurrency(purchase.totalAmount)}
              icon={Calculator}
              className="bg-primary text-white"
              valueClass="text-white"
              labelClass="text-primary-foreground/70"
            />
            <StatCard
              label="Amount Paid"
              value={formatCurrency(purchase.paidAmount)}
              icon={CreditCard}
              className="bg-white border-slate-100"
              valueClass="text-slate-800"
            />
            <StatCard
              label="Balance Due"
              value={formatCurrency(purchase.remainingAmount)}
              icon={TrendingDown}
              className="bg-white border-slate-100 shadow-sm"
              valueClass="text-primary"
            />
          </div>

          {/* Details Breakdown */}
          <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-white border-b border-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-50">
                  <Calculator className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Cost Breakdown</CardTitle>
                  <CardDescription>Detailed procurement expense analysis</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <CostItem icon={FileCheck} label="Base Price" value={purchase.purchaseAmount} />
                <CostItem icon={Globe} label="Shipping" value={purchase.shippingCost} />
                <CostItem icon={Users} label="Labour" value={purchase.labourCost} />
                <CostItem icon={Truck} label="Transport" value={purchase.transportationCost} />
                <CostItem icon={Package} label="Handling" value={purchase.handlingFee} />
                <CostItem
                  icon={FileCheck}
                  label="Documentation"
                  value={purchase.documentationFee}
                />
                <CostItem icon={Wrench} label="Groundfield" value={purchase.groundfieldCost} />
              </div>

              {purchase.costs && purchase.costs.length > 0 && (
                <div className="mt-6 pt-6 border-t border-dashed">
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-emerald-500" /> Dynamic Costs Ledger
                  </h4>
                  <div className="space-y-3">
                    {purchase.costs.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-700">{c.costType}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(c.costDate).toLocaleDateString()}{' '}
                            {c.description && `• ${c.description}`}
                          </p>
                        </div>
                        <p className="text-sm font-black text-slate-800">
                          {formatCurrency(c.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-white border-b border-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-50">
                  <History className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Payment History</CardTitle>
                  <CardDescription>All transactions recorded for this purchase</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              {!purchase.payments || purchase.payments.length === 0 ? (
                <div className="p-12 text-center italic text-slate-400 border-2 border-dashed border-slate-100 m-6 rounded-xl">
                  No payments have been recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest italic">
                          Date
                        </th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest italic">
                          Description
                        </th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest italic">
                          Method
                        </th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest italic text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {purchase.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-slate-700 italic border-l-4 border-transparent hover:border-primary">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {new Date(p.paymentDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">
                            {p.description || '--'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="font-bold border-slate-200">
                              {p.paymentMethod}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-slate-800 text-right">
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Context Information */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm overflow-hidden rounded-2xl bg-white">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest italic">
                Record Context
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <ContextItem icon={Boxes} label="Lot Reference" value={purchase.lotId.slice(0, 8)} />
              <ContextItem
                icon={User}
                label="Vendor Account"
                value={purchase.vendorId.slice(0, 8)}
              />
              <ContextItem
                icon={Building2}
                label="Branch Origin"
                value={purchase.branchId.slice(0, 8)}
              />
              <ContextItem
                icon={FileText}
                label="Created By"
                value={purchase.createdBy.slice(0, 8)}
              />
              <ContextItem
                icon={Calendar}
                label="System Entry"
                value={new Date(purchase.createdAt).toLocaleString()}
              />
            </CardContent>
          </Card>

          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 italic">
            <p className="text-xs text-primary font-bold mb-2">PRO TIP</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verify all shipping and handling costs before finalizing the payment settlement.
              Inventory creation is not blocked by payment status.
            </p>
          </div>
        </div>
      </div>

      <AddPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        purchaseId={purchase.id}
        totalAmount={purchase.totalAmount}
        paidAmount={purchase.paidAmount}
        onSuccess={fetchData}
      />
      <AddCostModal
        open={costModalOpen}
        onOpenChange={setCostModalOpen}
        purchaseId={purchase.id}
        onSuccess={fetchData}
      />
    </div>
  );
}

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  className: string;
  valueClass?: string;
  labelClass?: string;
}

function StatCard({ label, value, icon: Icon, className, valueClass, labelClass }: StatCardProps) {
  return (
    <Card className={`border-none ${className} rounded-2xl overflow-hidden`}>
      <CardContent className="p-6 flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={`text-[10px] font-black uppercase tracking-widest ${labelClass || 'text-slate-400'}`}
          >
            {label}
          </p>
          <p
            className={`text-2xl font-black italic tracking-tight ${valueClass || 'text-slate-800'}`}
          >
            {value}
          </p>
        </div>
        <div
          className={`p-3 rounded-xl ${className.includes('bg-primary') ? 'bg-white/10' : 'bg-slate-50'}`}
        >
          <Icon
            className={`h-6 w-6 ${className.includes('bg-primary') ? 'text-white' : 'text-slate-400'}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

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
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
          {label}
        </span>
      </div>
      <p className="text-sm font-black text-slate-700">{formatCurrency(value)}</p>
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
