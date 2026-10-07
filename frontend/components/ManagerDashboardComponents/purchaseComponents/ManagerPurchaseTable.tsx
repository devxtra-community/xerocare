'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Edit, CreditCard, Banknote } from 'lucide-react';
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
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { useExchangeRateMap, convertAmount, formatDualCurrency } from '@/lib/dualCurrency';
import { PurchaseOriginBadge } from '@/components/PurchaseOriginBadge';
import { PurchaseOrigin } from '@/lib/purchaseOrigin';
import AddPurchaseDialog from './AddPurchaseDialog';
import EditPurchaseDialog from './EditPurchaseDialog';
import AddPaymentModal from './AddPaymentModal';
import AddCostModal from './AddCostModal';
import PurchaseStats from './PurchaseStats';

/**
 * Manager Purchase Management Table.
 * Transitions to dedicated Details Page for full financial tracking.
 */
export default function ManagerPurchaseTable() {
  const router = useRouter();
  const currency = useBranchCurrency();
  const rates = useExchangeRateMap(currency);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<'ALL' | PurchaseOrigin>('ALL');
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const data = await purchaseService.getAllPurchases();
      setPurchases(data);
    } catch {
      toast.error('Failed to fetch lot amounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filtered = purchases.filter(
    (p) =>
      `${p.lotId} ${p.vendorId} ${p.lot?.lotNumber || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (originFilter === 'ALL' || p.purchaseOrigin === originFilter),
  );

  // Stats calculation. totalAmount is recorded in each purchase's own currencyCode (may be
  // foreign for international purchases), so it must be converted to the branch currency
  // before summing across purchases — otherwise mixed currencies get added as raw numbers.
  // paidAmount is not converted: AddPaymentModal always collects it in the branch currency.
  const toBase = (p: Purchase) =>
    convertAmount(Number(p.totalAmount), p.currencyCode, currency, rates, p.exchangeRate) ??
    Number(p.totalAmount);
  const totalCost = purchases.reduce((sum, p) => sum + toBase(p), 0);
  const domesticSpend = purchases
    .filter((p) => p.purchaseOrigin === PurchaseOrigin.DOMESTIC)
    .reduce((sum, p) => sum + toBase(p), 0);
  const internationalSpend = purchases
    .filter((p) => p.purchaseOrigin === PurchaseOrigin.INTERNATIONAL)
    .reduce((sum, p) => sum + toBase(p), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);
  const totalVendors = new Set(purchases.map((p) => p.vendorId)).size;
  const totalRecords = purchases.length;

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setEditOpen(true);
  };

  const handleView = (purchase: Purchase) => {
    router.push(`/manager/purchases/${purchase.id}`);
  };

  const handleRecordPayment = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPaymentOpen(true);
  };

  const handleRecordCost = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setCostOpen(true);
  };

  return (
    <div className="bg-muted min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl sm:text-2xl font-medium text-foreground italic tracking-tight">
          Lot Amount Records
        </h3>
      </div>

      <PurchaseStats
        totalCost={totalCost}
        totalVendors={totalVendors}
        totalProducts={totalRecords}
        totalPaid={totalPaid}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-success/30 bg-success/10 p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-success">
            Domestic Spend
          </p>
          <p className="mt-1 text-2xl font-black text-success">
            {formatCurrency(domesticSpend, currency)}
          </p>
          <p className="mt-1 text-xs font-medium text-success/80">
            Vendor country matches branch country
          </p>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-primary">
            International Spend
          </p>
          <p className="mt-1 text-2xl font-black text-primary">
            {formatCurrency(internationalSpend, currency)}
          </p>
          <p className="mt-1 text-xs font-medium text-primary/80">Cross-border vendor purchases</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lot or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl border-border bg-card"
          />
        </div>

        <select
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value as 'ALL' | PurchaseOrigin)}
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground"
          aria-label="Filter by purchase origin"
        >
          <option value="ALL">All Origins</option>
          <option value={PurchaseOrigin.DOMESTIC}>Domestic</option>
          <option value={PurchaseOrigin.INTERNATIONAL}>International</option>
        </select>

        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-11 px-6 rounded-xl font-bold italic shadow-lg shadow-primary/10 transition-all active:scale-95"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={18} /> Add Lot Amount
        </Button>
      </div>

      <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
        <Table pagination={{ pageSize: 10 }}>
          <TableHeader>
            <tr className="bg-muted/50">
              {[
                'Order ID',
                'Lot Reference',
                'Total Value',
                'Paid to Vendor',
                'Vendor Balance',
                'Status',
                'Origin',
                'Action',
              ].map((h) => (
                <TableHead
                  key={h}
                  className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic px-3 py-3 whitespace-nowrap"
                >
                  {h}
                </TableHead>
              ))}
            </tr>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse font-bold italic">
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                    Syncing Ledger...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic">
                  No lot amount records found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell className="px-3 py-3 font-bold text-foreground whitespace-nowrap">
                    #{p.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-medium text-muted-foreground whitespace-nowrap">
                    {p.lot?.lotNumber || p.lotId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-black text-foreground whitespace-nowrap">
                    {formatDualCurrency(
                      p.totalAmount,
                      p.currencyCode || currency,
                      currency,
                      rates,
                      p.exchangeRate,
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-bold text-success whitespace-nowrap">
                    {formatCurrency(p.paidAmount, currency)}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-bold text-primary whitespace-nowrap">
                    {formatDualCurrency(
                      p.remainingAmount,
                      p.currencyCode || currency,
                      currency,
                      rates,
                      p.exchangeRate,
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-black italic border whitespace-nowrap ${
                        p.status === 'PAID'
                          ? 'bg-success/10 text-success border-success/30'
                          : p.status === 'PARTIAL'
                            ? 'bg-warning/10 text-warning border-warning/30'
                            : 'bg-destructive/10 text-destructive border-destructive/30'
                      }`}
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <PurchaseOriginBadge origin={p.purchaseOrigin} />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        className="text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => handleView(p)}
                        title="Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => handleEdit(p)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="text-success hover:text-success transition-colors"
                        onClick={() => handleRecordCost(p)}
                        title="Add Cost"
                      >
                        <Banknote size={16} />
                      </button>
                      <button
                        className="text-success hover:text-success transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => handleRecordPayment(p)}
                        disabled={p.status === 'PAID'}
                        title="Record Payment"
                      >
                        <CreditCard size={16} />
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
          <AddPaymentModal
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            purchaseId={selectedPurchase.id}
            payableAmount={selectedPurchase.vendorPayableAmount ?? selectedPurchase.purchaseAmount}
            taxSettledSeparately={selectedPurchase.taxSettledSeparately ?? 0}
            paidAmount={selectedPurchase.paidAmount}
            purchaseCurrency={selectedPurchase.currencyCode}
            exchangeRate={selectedPurchase.exchangeRate}
            onSuccess={fetchPurchases}
          />
          <AddCostModal
            open={costOpen}
            onOpenChange={setCostOpen}
            purchaseId={selectedPurchase.id}
            onSuccess={fetchPurchases}
          />
        </>
      )}
    </div>
  );
}
