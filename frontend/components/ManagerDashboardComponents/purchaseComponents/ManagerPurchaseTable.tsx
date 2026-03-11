'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { purchaseService, Purchase } from '@/services/purchaseService';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import AddPurchaseDialog from './AddPurchaseDialog';
import EditPurchaseDialog from './EditPurchaseDialog';
import ViewPurchaseDialog from './ViewPurchaseDialog';
import PurchaseStats from './PurchaseStats';

/**
 * Manager Purchase Management Page.
 * Lists all purchase records with search, filtering, and CRUD operations.
 * Includes a statistical overview of total costs, vendors, products, and models purchased.
 */
export default function ManagerPurchaseTable() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const data = await purchaseService.getAllPurchases();
      setPurchases(data);
    } catch {
      toast.error('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filtered = purchases.filter((p) =>
    `${p.lotId} ${p.vendorId}`.toLowerCase().includes(search.toLowerCase()),
  );

  // Stats calculation
  const totalCost = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalVendors = new Set(purchases.map((p) => p.vendorId)).size;
  const totalProducts = purchases.length; // Simplified since product_ids is missing
  const totalModels = 0; // Simplified since model_ids is missing

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setEditOpen(true);
  };

  const handleView = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setViewOpen(true);
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Purchases</h3>
      </div>

      <PurchaseStats
        totalCost={totalCost}
        totalVendors={totalVendors}
        totalProducts={totalProducts}
        totalModels={totalModels}
      />

      <div className="flex items-center justify-between">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button className="bg-primary text-white gap-2" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Purchase
        </Button>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'ID',
                'LOT ID',
                'VENDOR ID',
                'PURCHASE AMT',
                'TOTAL AMT',
                'AMOUNT',
                'STATUS',
                'ACTION',
              ].map((h) => (
                <TableHead key={h} className="text-[11px] font-semibold text-primary px-4">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No purchases found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p, i) => (
                <TableRow key={p.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                  <TableCell className="px-4 font-medium">{p.id.slice(0, 8)}</TableCell>
                  <TableCell className="px-4">{p.lotId}</TableCell>
                  <TableCell className="px-4">{p.vendorId}</TableCell>
                  <TableCell className="px-4">{formatCurrency(p.purchaseAmount)}</TableCell>
                  <TableCell className="px-4">{formatCurrency(p.totalAmount)}</TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        p.status === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => handleView(p)}
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="text-primary hover:underline"
                        onClick={() => handleEdit(p)}
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddPurchaseDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchPurchases} />

      {selectedPurchase && (
        <>
          <EditPurchaseDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            purchase={selectedPurchase}
            onSuccess={fetchPurchases}
          />
          <ViewPurchaseDialog
            open={viewOpen}
            onOpenChange={setViewOpen}
            purchase={selectedPurchase}
          />
        </>
      )}
    </div>
  );
}
