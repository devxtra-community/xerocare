'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SaleOrder = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  orderStatus: 'New' | 'Processing' | 'Delivered' | 'Cancelled' | 'Shipped';
  deliveryType: 'Sale' | 'Rental' | 'Lease';
};

interface OrderUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SaleOrder | null;
  onUpdate: (updatedOrder: SaleOrder) => void;
}

/**
 * Dialog for updating the status and details of an existing sales order.
 * Allows modifying customer info, product details, payment status, and order status.
 */
export default function OrderUpdateDialog({
  open,
  onOpenChange,
  order,
  onUpdate,
}: OrderUpdateDialogProps) {
  const [formData, setFormData] = useState<SaleOrder | null>(null);

  useEffect(() => {
    if (order) {
      setFormData({ ...order });
    }
  }, [order, open]);

  if (!formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSelectChange = (name: keyof SaleOrder, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onUpdate(formData);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            Update Order: {formData.orderId}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Customer Name
              </label>
              <Input
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className="h-10 rounded-lg bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Customer Phone
              </label>
              <Input
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                className="h-10 rounded-lg bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Product
                </label>
                <Input
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="h-10 rounded-lg bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Quantity
                </label>
                <Input
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="h-10 rounded-lg bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Total Amount
                </label>
                <Input
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleChange}
                  className="h-10 rounded-lg bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Delivery Type
                </label>
                <Select
                  value={formData.deliveryType}
                  onValueChange={(val) => handleSelectChange('deliveryType', val)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sale">Sale</SelectItem>
                    <SelectItem value="Rental">Rental</SelectItem>
                    <SelectItem value="Lease">Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Payment Status
                </label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(val) => handleSelectChange('paymentStatus', val)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid" className="text-green-600 font-medium">
                      Paid
                    </SelectItem>
                    <SelectItem value="Pending" className="text-red-600 font-medium">
                      Pending
                    </SelectItem>
                    <SelectItem value="Partial" className="text-yellow-600 font-medium">
                      Partial
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Order Status
                </label>
                <Select
                  value={formData.orderStatus}
                  onValueChange={(val) => handleSelectChange('orderStatus', val)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New" className="text-blue-600 font-medium">
                      New
                    </SelectItem>
                    <SelectItem value="Processing" className="text-yellow-600 font-medium">
                      Processing
                    </SelectItem>
                    <SelectItem value="Shipped" className="text-blue-600 font-medium">
                      Shipped
                    </SelectItem>
                    <SelectItem value="Delivered" className="text-green-600 font-medium">
                      Delivered
                    </SelectItem>
                    <SelectItem value="Cancelled" className="text-red-600 font-medium">
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold text-gray-600 hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-white hover:bg-primary/90 font-bold px-8"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
