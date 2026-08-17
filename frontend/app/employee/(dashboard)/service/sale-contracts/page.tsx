'use client';

import React, { useEffect, useState } from 'react';
import {
  getSaleContracts,
  getSalePaymentsForInvoice,
  SaleContract,
  SalePaymentRequest,
  createInstallationRequest,
  assignTechnician,
  generateSalePaymentReceipt,
  updateDeliveryStatus,
  InstallationRequest,
} from '@/lib/saleWorkflow';
import { Customer } from '@/lib/customer';
import { Invoice } from '@/lib/invoice';
import { getTechnicians, ServiceTechnicianInfo } from '@/lib/serviceTicket';
import { ContractAgreementModal } from '@/components/employeeComponents/ContractAgreementModal';
import { InvoiceAccountView } from '@/components/invoice/InvoiceAccountView';
import { getActiveCurrency } from '@/lib/currency';
import { getApiErrorMessage } from '@/lib/apiError';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileSignature,
  Wrench,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileDown,
  Eye,
  PlusCircle,
} from 'lucide-react';
import { ProductDetailModal } from '@/components/shared/ProductDetailModal';

interface SaleContractRow extends SaleContract {
  payments?: SalePaymentRequest[];
  fullInvoice?: Invoice;
  customer?: Customer;
}

export default function SaleContractsPage() {
  const currency = getActiveCurrency();
  const [contracts, setContracts] = useState<SaleContractRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Expanded payment rows: track which contract rows are expanded
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [paymentsByInvoice, setPaymentsByInvoice] = useState<Record<string, SalePaymentRequest[]>>(
    {},
  );
  const [loadingPaymentsFor, setLoadingPaymentsFor] = useState<string | null>(null);
  const [generatingReceiptFor, setGeneratingReceiptFor] = useState<string | null>(null);

  // Product detail modal
  const [viewProductId, setViewProductId] = useState<string | null>(null);

  // Agreement modal
  const [agreementTarget, setAgreementTarget] = useState<SaleContractRow | null>(null);
  const [agreementOpen, setAgreementOpen] = useState(false);

  // Collection payment modal (Sale only — gated, goes to Finance queue)
  const [collectionInvoiceId, setCollectionInvoiceId] = useState<string | null>(null);

  // Installation modal
  const [installTarget, setInstallTarget] = useState<SaleContractRow | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installNotes, setInstallNotes] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [technicians, setTechnicians] = useState<ServiceTechnicianInfo[]>([]);
  const [isSavingInstall, setIsSavingInstall] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [data, techData] = await Promise.all([
        getSaleContracts(),
        getTechnicians().catch(() => [] as ServiceTechnicianInfo[]),
      ]);
      setContracts(data);
      setTechnicians(techData);
    } catch (err) {
      toast.error('Failed to load sale contracts', { description: getApiErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = contracts.filter(
    (c) =>
      !search ||
      c.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.customerName || '').toLowerCase().includes(search.toLowerCase()),
  );

  // Toggle payment history row
  const togglePayments = async (contractId: string) => {
    const next = new Set(expandedIds);
    if (next.has(contractId)) {
      next.delete(contractId);
      setExpandedIds(next);
      return;
    }
    next.add(contractId);
    setExpandedIds(next);

    if (paymentsByInvoice[contractId]) return; // already loaded
    setLoadingPaymentsFor(contractId);
    try {
      const pmts = await getSalePaymentsForInvoice(contractId);
      setPaymentsByInvoice((prev) => ({ ...prev, [contractId]: pmts }));
    } catch {
      // silently — user can retry by collapsing and re-expanding
    } finally {
      setLoadingPaymentsFor(null);
    }
  };

  const handleGenerateReceipt = async (pmt: SalePaymentRequest) => {
    setGeneratingReceiptFor(pmt.id);
    try {
      if (pmt.receiptUrl) {
        window.open(pmt.receiptUrl, '_blank');
        return;
      }
      const { receiptUrl } = await generateSalePaymentReceipt(pmt.id);
      // Update local state
      setPaymentsByInvoice((prev) => {
        const updated = { ...prev };
        if (updated[pmt.invoiceId]) {
          updated[pmt.invoiceId] = updated[pmt.invoiceId].map((p) =>
            p.id === pmt.id ? { ...p, receiptUrl } : p,
          );
        }
        return updated;
      });
      window.open(receiptUrl, '_blank');
      toast.success('Receipt generated', {
        description: `${pmt.requestNo} receipt opened in new tab.`,
      });
    } catch (err) {
      toast.error('Failed to generate receipt', { description: getApiErrorMessage(err) });
    } finally {
      setGeneratingReceiptFor(null);
    }
  };

  const isSaleType = (saleType?: string | null) =>
    ['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'].includes(saleType || '');

  const handleDeliveryStatusChange = async (
    contract: SaleContractRow,
    value: 'DELIVERED' | 'NOT_DELIVERED',
  ) => {
    const previous = contract.deliveryStatus;
    if (previous === value) return;
    setContracts((prev) =>
      prev.map((c) => (c.id === contract.id ? { ...c, deliveryStatus: value } : c)),
    );
    try {
      await updateDeliveryStatus(contract.id, value);
      toast.success(value === 'DELIVERED' ? 'Marked as delivered' : 'Marked as not delivered', {
        description: contract.invoiceNumber,
      });
    } catch (err) {
      // Roll back on failure
      setContracts((prev) =>
        prev.map((c) => (c.id === contract.id ? { ...c, deliveryStatus: previous } : c)),
      );
      toast.error('Failed to update delivery status', { description: getApiErrorMessage(err) });
    }
  };

  const statusBadge = (contract: SaleContractRow) => {
    const installed = contract.installation?.status === 'COMPLETED';
    if (installed)
      return (
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">
          Installed
        </span>
      );
    // Agreement statuses only apply to Rent/Lease
    if (!isSaleType(contract.saleType)) {
      const isFullySigned = contract.agreement?.signatureStatus === 'FULLY_SIGNED';
      if (isFullySigned)
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-wider">
            Signed
          </span>
        );
      if (contract.agreement)
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider">
            Partial Sig.
          </span>
        );
      return (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-wider">
          No Agreement
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-wider">
        Active
      </span>
    );
  };

  const openInstall = (contract: SaleContractRow) => {
    setInstallTarget(contract);
    setInstallNotes('');
    setTechnicianId('');
    setTechnicianName('');
    setInstallOpen(true);
  };

  const handleCreateInstall = async () => {
    if (!installTarget) return;
    setIsSavingInstall(true);
    try {
      let install: InstallationRequest;
      if (!installTarget.installation) {
        install = await createInstallationRequest(installTarget.id, {
          customerName: installTarget.customerName ?? '',
          invoiceNumber: installTarget.invoiceNumber,
          notes: installNotes || undefined,
        });
      } else {
        install = installTarget.installation;
      }

      if (technicianId) {
        await assignTechnician(install.id, technicianId, technicianName);
      }

      toast.success('Installation request created', {
        description: technicianId ? `Assigned to ${technicianName}` : 'Unassigned — assign later.',
      });
      setInstallOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to create installation request', {
        description: getApiErrorMessage(err),
      });
    } finally {
      setIsSavingInstall(false);
    }
  };

  const techOptions = technicians.map((t) => {
    const fullName = t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email;
    return {
      value: t.id,
      label: fullName,
      searchText: `${fullName} ${t.email} ${t.employeeJob}`,
      description: t.employeeJob || 'SERVICE_TECHNICIAN',
    };
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Customer Contracts</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Sale, Rent & Lease contracts — agreements, signatures, and payments
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-9"
        >
          <RefreshCw size={12} className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice or customer..."
          className="pl-9 h-9 border-slate-200 text-sm font-bold"
        />
      </div>

      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileSignature size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No sale contracts found</p>
              <p className="text-xs text-slate-400 mt-1">
                Sale, rent, and lease contracts appear here after conversion and activation.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="w-8" />
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Invoice
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Customer
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Created By
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Type
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Total
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Agreement
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Delivery
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contract) => {
                  const isExpanded = expandedIds.has(contract.id);
                  const contractPayments = paymentsByInvoice[contract.id] ?? [];
                  const isLoadingPmts = loadingPaymentsFor === contract.id;

                  // Customer signed check — covers both IN_PERSON/REMOTE (signatureData) and UPLOAD (documentUrl)
                  const customerHasSigned =
                    contract.agreement?.customerSignatureData ||
                    contract.agreement?.customerSignedDocumentUrl;

                  return (
                    <React.Fragment key={contract.id}>
                      <TableRow className="hover:bg-slate-50/50">
                        {/* Expand toggle */}
                        <TableCell className="p-0 pl-2">
                          <button
                            onClick={() => togglePayments(contract.id)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400"
                            title="Toggle payment history"
                          >
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        </TableCell>
                        <TableCell className="font-black text-slate-800 text-sm">
                          {contract.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-bold text-slate-600 text-sm">
                          {contract.customerName || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {contract.createdByEmployeeName || '—'}
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] font-black text-slate-500 uppercase">
                            {contract.saleType?.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="font-black text-slate-800">
                          {currency} {Number(contract.totalAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{statusBadge(contract)}</TableCell>
                        <TableCell>
                          {isSaleType(contract.saleType) ? (
                            <span className="text-[10px] text-slate-400">—</span>
                          ) : contract.agreement ? (
                            <div className="flex items-center gap-1">
                              {contract.agreement.employeeSignatureData && (
                                <CheckCircle2
                                  size={12}
                                  className="text-emerald-500"
                                  aria-label="Employee signed"
                                />
                              )}
                              {customerHasSigned ? (
                                <CheckCircle2
                                  size={12}
                                  className="text-blue-500"
                                  aria-label="Customer signed"
                                />
                              ) : (
                                <Clock
                                  size={12}
                                  className="text-amber-400"
                                  aria-label="Customer pending"
                                />
                              )}
                              <span className="text-[10px] font-bold text-slate-500">
                                {contract.agreement.agreementNumber}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={contract.deliveryStatus || 'NOT_DELIVERED'}
                            onValueChange={(val) =>
                              handleDeliveryStatusChange(
                                contract,
                                val as 'DELIVERED' | 'NOT_DELIVERED',
                              )
                            }
                          >
                            <SelectTrigger
                              className={`h-7 w-32.5 text-[10px] font-black uppercase tracking-wide ${
                                contract.deliveryStatus === 'DELIVERED'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-amber-200 bg-amber-50 text-amber-700'
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOT_DELIVERED">Not Delivered</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {contract.currentProductId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewProductId(contract.currentProductId!)}
                                className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-50"
                                title={`View product · ${contract.currentSerialNumber ?? ''}`}
                              >
                                <Eye size={14} />
                              </Button>
                            )}
                            {!isSaleType(contract.saleType) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAgreementTarget(contract);
                                  setAgreementOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-indigo-500 hover:bg-indigo-50"
                                title="Contract Agreement"
                              >
                                <FileSignature size={14} />
                              </Button>
                            )}
                            {contract.deliveryStatus === 'DELIVERED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openInstall(contract)}
                                className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-50"
                                title="Installation Request"
                              >
                                <Wrench size={14} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Payments sub-row */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-0 bg-slate-50/60">
                            <div className="px-6 py-3 border-l-2 border-indigo-200 ml-6">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  Payment History
                                </p>
                                {isSaleType(contract.saleType) && (
                                  <button
                                    onClick={() => setCollectionInvoiceId(contract.id)}
                                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-2 py-0.5 transition-colors"
                                    title="Record a new collection payment (sent to Finance for approval)"
                                  >
                                    <PlusCircle size={9} />
                                    Record Collection
                                  </button>
                                )}
                              </div>
                              {isLoadingPmts ? (
                                <div className="flex items-center gap-2 py-2 text-slate-400">
                                  <Loader2 size={12} className="animate-spin" />
                                  <span className="text-xs">Loading payments…</span>
                                </div>
                              ) : contractPayments.length === 0 ? (
                                <p className="text-xs text-slate-400 py-1">
                                  No payments recorded yet.
                                </p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-[9px] text-slate-400 font-black uppercase tracking-wide">
                                      <th className="text-left pb-1 pr-4">Request No.</th>
                                      <th className="text-left pb-1 pr-4">Context</th>
                                      <th className="text-left pb-1 pr-4">Mode</th>
                                      <th className="text-right pb-1 pr-4">Amount</th>
                                      <th className="text-left pb-1 pr-4">Date</th>
                                      <th className="text-left pb-1 pr-4">Status</th>
                                      <th className="text-left pb-1">Receipt</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {contractPayments.map((pmt) => {
                                      const isGenerating = generatingReceiptFor === pmt.id;
                                      return (
                                        <tr key={pmt.id} className="text-slate-600">
                                          <td className="py-1 pr-4 font-mono font-bold text-slate-700">
                                            {pmt.requestNo}
                                          </td>
                                          <td className="py-1 pr-4">
                                            {pmt.paymentContext
                                              ? pmt.paymentContext.replace(/_/g, ' ')
                                              : '—'}
                                          </td>
                                          <td className="py-1 pr-4">
                                            {pmt.paymentMode.replace('_', ' ')}
                                          </td>
                                          <td className="py-1 pr-4 text-right font-mono font-bold">
                                            {pmt.currency}{' '}
                                            {Number(pmt.amount).toLocaleString(undefined, {
                                              minimumFractionDigits: 2,
                                            })}
                                          </td>
                                          <td className="py-1 pr-4">
                                            {new Date(pmt.paymentDate).toLocaleDateString('en-GB')}
                                          </td>
                                          <td className="py-1 pr-4">
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                                pmt.status === 'APPROVED'
                                                  ? 'bg-emerald-100 text-emerald-700'
                                                  : pmt.status === 'REJECTED'
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-amber-100 text-amber-700'
                                              }`}
                                            >
                                              {pmt.status}
                                            </span>
                                          </td>
                                          <td className="py-1">
                                            {/* Sale: receipt available immediately; Rent/Lease: gated by approval */}
                                            {(
                                              isSaleType(contract.saleType)
                                                ? pmt.status !== 'REJECTED'
                                                : pmt.status === 'APPROVED'
                                            ) ? (
                                              <button
                                                onClick={() => handleGenerateReceipt(pmt)}
                                                disabled={isGenerating}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                                title={
                                                  pmt.receiptUrl
                                                    ? 'View Receipt'
                                                    : 'Generate Receipt'
                                                }
                                              >
                                                {isGenerating ? (
                                                  <Loader2 size={10} className="animate-spin" />
                                                ) : pmt.receiptUrl ? (
                                                  <ExternalLink size={10} />
                                                ) : (
                                                  <FileDown size={10} />
                                                )}
                                                {pmt.receiptUrl ? 'View' : 'Get Receipt'}
                                              </button>
                                            ) : pmt.status === 'PENDING' ? (
                                              <span className="text-[9px] text-amber-500 flex items-center gap-0.5">
                                                <Clock size={9} />
                                                Pending
                                              </span>
                                            ) : (
                                              <span className="text-[9px] text-slate-300">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sale Collection Payment (gated — goes to Finance queue) */}
      {collectionInvoiceId && (
        <InvoiceAccountView
          invoiceId={collectionInvoiceId}
          open={!!collectionInvoiceId}
          gated
          onClose={() => {
            setCollectionInvoiceId(null);
            // Reload payments for this invoice so the new PENDING row appears immediately
            setPaymentsByInvoice((prev) => {
              const updated = { ...prev };
              delete updated[collectionInvoiceId];
              return updated;
            });
          }}
        />
      )}

      {/* Contract Agreement Modal (Rent/Lease only) */}
      {agreementTarget && (
        <ContractAgreementModal
          open={agreementOpen}
          invoice={
            {
              id: agreementTarget.id,
              invoiceNumber: agreementTarget.invoiceNumber,
              customerName: agreementTarget.customerName,
              saleType: agreementTarget.saleType,
              totalAmount: agreementTarget.totalAmount,
              items: [],
            } as unknown as Invoice
          }
          customer={null}
          branchName="Xerocare"
          onClose={() => setAgreementOpen(false)}
          onSigned={(ag) => {
            setContracts((prev) =>
              prev.map((c) => (c.id === agreementTarget.id ? { ...c, agreement: ag } : c)),
            );
          }}
        />
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={viewProductId}
        open={!!viewProductId}
        onClose={() => setViewProductId(null)}
      />

      {/* Installation Request Modal */}
      <Dialog open={installOpen} onOpenChange={(v) => !v && setInstallOpen(false)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Installation Request</DialogTitle>
          <div className="bg-linear-to-r from-slate-700 to-slate-600 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <Wrench size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                  Installation Request
                </p>
                <p className="text-base font-black">{installTarget?.invoiceNumber}</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {installTarget?.installation ? (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-black text-blue-700">
                  Installation request already created
                </p>
                <p className="text-[11px] text-blue-600 mt-1">
                  Status: {installTarget.installation.status}
                  {installTarget.installation.technicianName &&
                    ` — Assigned to ${installTarget.installation.technicianName}`}
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                  Notes
                </Label>
                <Input
                  value={installNotes}
                  onChange={(e) => setInstallNotes(e.target.value)}
                  placeholder="Installation notes or instructions..."
                  className="h-10 border-slate-200 font-bold text-xs"
                />
              </div>
            )}
            <div>
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Assign Technician (optional)
              </Label>
              <SearchableSelect
                value={technicianId}
                onValueChange={(val) => {
                  setTechnicianId(val);
                  const tech = technicians.find((t) => t.id === val);
                  setTechnicianName(
                    tech
                      ? tech.name || `${tech.first_name || ''} ${tech.last_name || ''}`.trim()
                      : '',
                  );
                }}
                placeholder="Search and select technician..."
                className="h-10 border-slate-200"
                options={techOptions}
              />
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t flex justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => setInstallOpen(false)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInstall}
              disabled={isSavingInstall}
              className="bg-slate-700 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest px-6 rounded-xl"
            >
              {isSavingInstall ? (
                <Loader2 size={14} className="animate-spin" />
              ) : installTarget?.installation ? (
                'Assign Technician'
              ) : (
                'Create Request'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
