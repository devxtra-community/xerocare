'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Eye, Edit, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Purchase, deletePurchase as apiDeletePurchase } from '@/lib/purchase';
import { toast } from 'sonner';
import { AddPurchaseDialog } from './AddPurchaseDialog';
import { Badge } from '@/components/ui/badge';

export default function PurchaseTable({
  purchases,
  loading,
  onRefresh,
}: {
  purchases: Purchase[];
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      p.lotNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDeletePurchase(deleteTarget.id);
      toast.success('Purchase information deleted');
      onRefresh();
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete purchase');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-primary font-medium">Loading purchases...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-primary/10 shadow-sm">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Purchase #, Lot # or Vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-primary/20 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none shadow-sm transition-all rounded-xl"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 bg-white border-primary/20 hover:bg-primary/5 rounded-xl"
              >
                <Filter className="h-4 w-4" />
                Filter: {filterStatus}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterStatus('All')}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('PENDING')}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('COMPLETED')}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('CANCELLED')}>
                Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="bg-primary text-white gap-2 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90"
            onClick={() => {
              setEditingPurchase(null);
              setAddDialogOpen(true);
            }}
          >
            <Plus size={16} /> Add Purchase
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-2 sm:p-4 shadow-sm w-full border border-primary/10 overflow-hidden min-h-[400px] flex flex-col">
        <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
          <Table className="min-w-[1050px] border-collapse relative">
            <TableHeader>
              <TableRow className="border-b border-primary/10 hover:bg-transparent">
                <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-4">
                  Purchase #
                </TableHead>
                <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2">
                  Lot Number
                </TableHead>
                <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2">
                  Vendor
                </TableHead>
                <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2">
                  Products
                </TableHead>
                <TableHead className="text-right text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-2">
                  Total Cost
                </TableHead>
                <TableHead className="text-left text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-4">
                  Status
                </TableHead>
                <TableHead className="text-right text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-wider py-3 px-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => (
                  <TableRow
                    key={purchase.id}
                    className="hover:bg-primary/5 transition-colors border-b border-primary/5"
                  >
                    <TableCell className="py-3 px-4 text-[10px] sm:text-sm font-semibold text-primary">
                      {purchase.purchaseNumber}
                    </TableCell>
                    <TableCell className="py-3 px-2 text-[10px] sm:text-sm text-primary/80">
                      {purchase.lotNumber}
                    </TableCell>
                    <TableCell className="py-3 px-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-sm font-medium text-primary/90">
                          {purchase.vendorName}
                        </span>
                        <span className="text-[9px] sm:text-xs text-primary/60">
                          {purchase.vendorEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2">
                      <div
                        className="text-[10px] sm:text-sm text-primary/80 max-w-[200px] truncate"
                        title={purchase.items?.map((i) => i.productName).join(', ')}
                      >
                        {purchase.items && purchase.items.length > 0
                          ? `${purchase.items[0].productName} ${purchase.items.length > 1 ? `+${purchase.items.length - 1} more` : ''}`
                          : 'No items'}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-right text-[10px] sm:text-sm font-bold text-primary">
                      ₹ {purchase.totalCost.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge
                        variant={purchase.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className={`text-[10px] px-2 py-0.5 pointer-events-none ${
                          purchase.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'
                            : purchase.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200'
                        }`}
                      >
                        {purchase.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/5"
                          onClick={() => router.push(`/manager/purchases/${purchase.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/5"
                          onClick={() => {
                            setEditingPurchase(purchase);
                            setAddDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(purchase)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-primary/40 italic">
                    No purchases found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: oklch(var(--muted));
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: oklch(var(--primary));
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: oklch(var(--primary) / 0.8);
          }
        `}</style>
      </div>

      <DateleteModal
        open={!!deleteTarget}
        title={deleteTarget?.purchaseNumber || ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <AddPurchaseDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={onRefresh}
        initialData={editingPurchase}
      />
    </div>
  );
}

function DateleteModal({
  open,
  title,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-4 text-red-600 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-sm">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-primary">Delete Purchase</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600 leading-relaxed">
            Are you sure you want to delete purchase <strong>{title}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end items-center gap-6 pt-8">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <Button
            className="h-12 px-8 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold shadow-lg"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
