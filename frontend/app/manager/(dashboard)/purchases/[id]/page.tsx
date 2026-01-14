'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPurchaseById, Purchase } from '@/lib/purchase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function PurchaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPurchase = async () => {
      setLoading(true);
      try {
        const data = await getPurchaseById(id);
        if (data) {
          setPurchase(data);
        } else {
          toast.error('Purchase not found');
          router.push('/manager/purchases');
        }
      } catch {
        toast.error('Failed to load purchase details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPurchase();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="p-8 text-center text-primary font-medium">Loading purchase details...</div>
    );
  }

  if (!purchase) return null;

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Purchase {purchase.purchaseNumber}
              <span
                className={`text-sm px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${
                  purchase.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : purchase.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {purchase.status}
              </span>
            </h1>
            <p className="text-sm text-slate-500">
              Lot #{purchase.lotNumber} • Created on {new Date(purchase.date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white">
            <Printer size={16} /> Print
          </Button>
          <Button variant="outline" className="gap-2 bg-white">
            <Download size={16} /> Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Info */}
        <Card className="lg:col-span-1 shadow-sm border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg">Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Vendor Name</p>
              <p className="font-medium text-gray-900">{purchase.vendorName}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <p className="font-medium text-gray-900">{purchase.vendorEmail}</p>
              </div>
            </div>
            {/* Add more vendor details if available via separate fetch or expanded purchase object */}
          </CardContent>
        </Card>

        {/* Purchase Items */}
        <Card className="lg:col-span-2 shadow-sm border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg">Products / Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items && purchase.items.length > 0 ? (
                    purchase.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-slate-500">{item.modelName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          ₹{Number(item.unitCost).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₹
                          {(
                            (Number(item.quantity) || 0) * (Number(item.unitCost) || 0)
                          ).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-slate-400">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Total Footer */}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={4} className="text-right">
                      Total Amount
                    </TableCell>
                    <TableCell className="text-right text-lg text-primary">
                      ₹{purchase.totalCost.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
