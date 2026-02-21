'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/lib/invoice';
import { Coins, Calendar, User, Phone, FileText, Image as ImageIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import Image from 'next/image';

interface UsagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  usageData: {
    bwA4Count: number;
    bwA3Count: number;
    colorA4Count: number;
    colorA3Count: number;
    bwA4Delta: number;
    bwA3Delta: number;
    colorA4Delta: number;
    colorA3Delta: number;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    meterImageUrl?: string;
    remarks?: string;
    extraBwCount?: number;
    extraColorCount?: number;
    monthlyRent?: number;
    additionalCharges?: number;
    additionalChargesRemarks?: string;
  };
}

/**
 * Preview dialog for usage recordings before they are confirmed.
 * Displays calculated deltas, excess charges, and meter image for verification.
 * Modal dialog for previewing usage charges before recording.
 * Shows checks calculated costs, excess usage, and net payable amount.
 */
export default function UsagePreviewDialog({
  isOpen,
  onClose,
  invoice,
  usageData,
}: UsagePreviewDialogProps) {
  // Helper to safely parse numbers
  const safeParse = (val: unknown) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.-]+/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Calculate pricing breakdown
  const calculatePricing = () => {
    const isCpc = invoice.rentType?.includes('CPC');
    const baseRent =
      usageData.monthlyRent !== undefined ? usageData.monthlyRent : safeParse(invoice.monthlyRent);
    const monthlyRent = isCpc ? 0 : baseRent;
    const additionalCharges = usageData.additionalCharges || 0;
    const advance = safeParse(invoice.advanceAmount);

    let bwExcessCost = 0;
    let colorExcessCost = 0;
    let bwExcessUnits = 0;
    let colorExcessUnits = 0;
    let bwRate = 0;
    let colorRate = 0;
    let bwLimit = 0;
    let colorLimit = 0;

    // BW Excess Calculation
    const bwRule = invoice.items?.find(
      (i) =>
        (i.itemType === 'PRICING_RULE' || !i.itemType) &&
        (i.description.includes('Black') || i.description.includes('Combined')),
    );
    if (bwRule) {
      const totalDelta = usageData.bwA4Delta + usageData.bwA3Delta * 2;
      bwLimit =
        bwRule.bwIncludedLimit !== undefined
          ? bwRule.bwIncludedLimit
          : bwRule.combinedIncludedLimit || 0;
      bwRate = bwRule.bwExcessRate || bwRule.combinedExcessRate || 0;
      bwExcessUnits = Math.max(0, totalDelta + (usageData.extraBwCount || 0) - bwLimit);
      bwExcessCost = bwExcessUnits * bwRate;
    }

    // Color Excess Calculation
    const colorRule = invoice.items?.find(
      (i) =>
        (i.itemType === 'PRICING_RULE' || !i.itemType) &&
        (i.description.includes('Color') || i.description.includes('Combined')),
    );
    if (colorRule) {
      const totalDelta = usageData.colorA4Delta + usageData.colorA3Delta * 2;
      colorLimit =
        colorRule.colorIncludedLimit !== undefined
          ? colorRule.colorIncludedLimit
          : colorRule.combinedIncludedLimit || 0;
      colorRate = colorRule.colorExcessRate || colorRule.combinedExcessRate || 0;
      colorExcessUnits = Math.max(0, totalDelta + (usageData.extraColorCount || 0) - colorLimit);
      colorExcessCost = colorExcessUnits * colorRate;
    }

    const totalExcess = bwExcessCost + colorExcessCost;
    const total = monthlyRent + totalExcess + additionalCharges - advance;

    return {
      monthlyRent,
      additionalCharges,
      additionalChargesRemarks: usageData.additionalChargesRemarks,
      advance,
      bwExcessCost,
      colorExcessCost,
      bwExcessUnits,
      colorExcessUnits,
      bwRate,
      colorRate,
      bwLimit,
      colorLimit,
      totalExcess,
      extraBw: usageData.extraBwCount || 0,
      extraColor: usageData.extraColorCount || 0,
      total: Math.round((total + Number.EPSILON) * 100) / 100,
      isCpc,
    };
  };

  const pricing = calculatePricing();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-700">
            Usage Record Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Information */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
              <User size={16} />
              Customer Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-semibold">{invoice.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="font-semibold flex items-center gap-1">
                  <Phone size={14} />
                  {invoice.customerPhone || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Invoice Number</p>
                <p className="font-semibold">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Contract Type</p>
                <p className="font-semibold">{invoice.rentType}</p>
              </div>
            </div>
          </div>

          {/* Billing Period */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
              <Calendar size={16} />
              Billing Period
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-blue-500">Period Start</p>
                <p className="font-semibold text-blue-700">
                  {format(new Date(usageData.billingPeriodStart), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-500">Period End</p>
                <p className="font-semibold text-blue-700">
                  {format(new Date(usageData.billingPeriodEnd), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Summary */}
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
            <h3 className="text-sm font-bold text-orange-600 uppercase mb-3 flex items-center gap-2">
              <FileText size={16} />
              Usage Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* BW Usage */}
              {usageData.bwA4Count + usageData.bwA3Count > 0 && (
                <div className="bg-white rounded p-3 border border-orange-100">
                  <p className="text-xs font-semibold text-orange-600 mb-2">Black & White</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">A4 Copies:</span>
                      <span className="font-semibold">{usageData.bwA4Count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">A3 Copies:</span>
                      <span className="font-semibold">{usageData.bwA3Count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-orange-100">
                      <span className="text-slate-600">Monthly Usage (A4 equiv):</span>
                      <span className="font-bold text-orange-600">
                        {(usageData.bwA4Delta + usageData.bwA3Delta * 2).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>Manual Extra:</span>
                      <span>{pricing.extraBw.toLocaleString()}</span>
                    </div>
                    {pricing.bwExcessUnits > 0 && (
                      <div className="flex justify-between pt-1 border-t border-orange-100 font-bold">
                        <span className="text-red-600">Total Chargeable:</span>
                        <span className="text-red-600">
                          {pricing.bwExcessUnits.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Color Usage */}
              {usageData.colorA4Count + usageData.colorA3Count > 0 && (
                <div className="bg-white rounded p-3 border border-orange-100">
                  <p className="text-xs font-semibold text-orange-600 mb-2">Color</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">A4 Copies:</span>
                      <span className="font-semibold">
                        {usageData.colorA4Count.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">A3 Copies:</span>
                      <span className="font-semibold">
                        {usageData.colorA3Count.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-orange-100">
                      <span className="text-slate-600">Monthly Usage (A4 equiv):</span>
                      <span className="font-bold text-orange-600">
                        {(usageData.colorA4Delta + usageData.colorA3Delta * 2).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>Manual Extra:</span>
                      <span>{pricing.extraColor.toLocaleString()}</span>
                    </div>
                    {pricing.colorExcessUnits > 0 && (
                      <div className="flex justify-between pt-1 border-t border-orange-100 font-bold">
                        <span className="text-red-600">Total Chargeable:</span>
                        <span className="text-red-600">
                          {pricing.colorExcessUnits.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <h3 className="text-sm font-bold text-green-700 uppercase mb-3 flex items-center gap-2">
              <Coins size={16} />
              Pricing Breakdown
            </h3>
            <div className="space-y-2">
              {!pricing.isCpc && (
                <div className="flex justify-between items-center py-2 border-b border-green-100">
                  <span className="text-slate-700">Monthly Rent</span>
                  <span className="font-semibold text-green-700 flex items-center gap-1">
                    {formatCurrency(pricing.monthlyRent)}
                  </span>
                </div>
              )}

              {pricing.bwExcessUnits > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-green-100">
                  <div>
                    <span className="text-slate-700">BW Excess Charges</span>
                    <p className="text-xs text-slate-500">
                      {pricing.bwExcessUnits} units × {formatCurrency(pricing.bwRate)}
                    </p>
                  </div>
                  <span className="font-semibold text-orange-600 flex items-center gap-1">
                    {formatCurrency(pricing.bwExcessCost)}
                  </span>
                </div>
              )}

              {pricing.colorExcessUnits > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-green-100">
                  <div>
                    <span className="text-slate-700">Color Excess Charges</span>
                    <p className="text-xs text-slate-500">
                      {pricing.colorExcessUnits} units × {formatCurrency(pricing.colorRate)}
                    </p>
                  </div>
                  <span className="font-semibold text-orange-600 flex items-center gap-1">
                    {formatCurrency(pricing.colorExcessCost)}
                  </span>
                </div>
              )}

              {pricing.additionalCharges > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-green-100">
                  <div>
                    <span className="text-slate-700">Additional Charges</span>
                    <p className="text-xs text-slate-500">
                      {pricing.additionalChargesRemarks || 'Extra services/charges'}
                    </p>
                  </div>
                  <span className="font-semibold text-orange-600 flex items-center gap-1">
                    {formatCurrency(pricing.additionalCharges)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b border-green-100 mt-2">
                <span className="text-base font-bold text-slate-700">Grand Total (Gross)</span>
                <span className="text-lg font-bold text-slate-700 flex items-center gap-1">
                  {formatCurrency(
                    pricing.monthlyRent + pricing.totalExcess + pricing.additionalCharges,
                  )}
                </span>
              </div>

              {pricing.advance > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-green-100">
                  <span className="text-slate-700">Advance (Deduction)</span>
                  <span className="font-semibold text-red-600 flex items-center gap-1">
                    - {formatCurrency(pricing.advance)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-3 bg-green-100 rounded px-3 mt-2">
                <span className="text-lg font-bold text-green-800">Net Payable</span>
                <span className="text-2xl font-bold text-green-700 flex items-center gap-1">
                  {formatCurrency(pricing.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Meter Image */}
          {usageData.meterImageUrl && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
                <ImageIcon size={16} />
                Meter Image
              </h3>
              <Image
                src={usageData.meterImageUrl}
                alt="Meter reading"
                width={800}
                height={600}
                className="w-full rounded border border-slate-300 h-auto"
                unoptimized
              />
            </div>
          )}

          {/* Remarks */}
          {usageData.remarks && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-600 uppercase mb-2">Remarks</h3>
              <p className="text-sm text-slate-700">{usageData.remarks}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
