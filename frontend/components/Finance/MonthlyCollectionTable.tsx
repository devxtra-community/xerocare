'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getCollectionAlerts,
  CollectionAlert,
  generateMonthlyInvoice,
  createNextMonthInvoice,
} from '@/lib/invoice';
import { Loader2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { InvoiceDetailsDialog } from '../invoice/InvoiceDetailsDialog';
import { getInvoiceById, Invoice } from '@/lib/invoice';
import UsageRecordingModal from './UsageRecordingModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function MonthlyCollectionTable({ mode }: { mode?: 'RENT' | 'LEASE' }) {
  const [alerts, setAlerts] = useState<CollectionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<CollectionAlert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingAlert, setViewingAlert] = useState<CollectionAlert | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const dateStr = format(new Date(selectedYear, selectedMonth, 1), 'yyyy-MM-dd');
      const data = await getCollectionAlerts(dateStr);
      // Client-side filtering
      const filtered = mode ? data.filter((a) => a.saleType === mode) : data;
      setAlerts(filtered);
    } catch (error) {
      console.error('Failed to fetch alerts', error);
      toast.error('Failed to load collection alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedMonth, selectedYear]);

  const handleRecordUsage = (alert: CollectionAlert) => {
    setSelectedContract(alert);
    setIsModalOpen(true);
  };

  const handleGenerateInvoice = async (alert: CollectionAlert) => {
    setGenerating(alert.contractId);
    try {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);

      await generateMonthlyInvoice({
        contractId: alert.contractId,
        billingPeriodStart: format(start, 'yyyy-MM-dd'),
        billingPeriodEnd: format(end, 'yyyy-MM-dd'),
      });

      toast.success('Monthly Invoice Generated');
      fetchAlerts(); // Refresh to remove from list
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(null);
    }
  };

  const handleRecordNextUsage = async (alert: CollectionAlert) => {
    setGenerating(alert.contractId);
    try {
      // 1. Generate current month invoice
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);

      await generateMonthlyInvoice({
        contractId: alert.contractId,
        billingPeriodStart: format(start, 'yyyy-MM-dd'),
        billingPeriodEnd: format(end, 'yyyy-MM-dd'),
      });

      // 2. Create Next Month Invoice (Usage Record)
      await createNextMonthInvoice(alert.contractId);

      toast.success('Invoice Generated. Moving to next month...');

      // 3. Move to next month
      let nextMonth = selectedMonth + 1;
      let nextYear = selectedYear;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }

      setSelectedMonth(nextMonth);
      setSelectedYear(nextYear);

      // 4. Trigger recording modal for next month
      setSelectedContract(alert);
      setIsModalOpen(true);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to process next month');
    } finally {
      setGenerating(null);
    }
  };

  const handleViewDetails = async (alert: CollectionAlert) => {
    try {
      const targetId = alert.finalInvoiceId || alert.contractId;
      const inv = await getInvoiceById(targetId);
      setViewingInvoice(inv);
      setViewingAlert(alert);
    } catch {
      toast.error('Failed to load invoice details');
    }
  };

  const handleUpdateUsage = async (alert: CollectionAlert) => {
    try {
      const inv = await getInvoiceById(alert.contractId);
      setEditingInvoice(inv);
      setSelectedContract(alert);
      setIsModalOpen(true);
    } catch {
      toast.error('Failed to load invoice for update');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Monthly Collections</h2>
          <p className="text-sm text-slate-500">
            Manage billing and usage for {months[selectedMonth]} {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px] bg-white">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contract / Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500 bg-slate-50/30">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 opacity-20" />
                    <p className="font-medium text-slate-400">
                      No pending collections for {months[selectedMonth]} {selectedYear}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow key={alert.contractId}>
                  <TableCell className="font-medium">
                    {alert.customerName || 'Unknown Customer'}
                    <div className="text-xs text-muted-foreground">
                      {alert.customerPhone || alert.customerId}
                    </div>
                  </TableCell>
                  <TableCell>{alert.invoiceNumber}</TableCell>
                  <TableCell>
                    {alert.type === 'USAGE_PENDING' ? (
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-600 border-orange-200"
                      >
                        Usage Pending
                      </Badge>
                    ) : alert.type === 'INVOICE_PENDING' ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                        Invoice Pending
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-600 border-green-200"
                      >
                        Send Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {alert.dueDate
                      ? (() => {
                          const days = differenceInDays(new Date(alert.dueDate), new Date());
                          return (
                            <div
                              className={`font-bold ${days < 0 ? 'text-red-500' : days <= 3 ? 'text-orange-500' : 'text-emerald-600'}`}
                            >
                              {days < 0 ? `${Math.abs(days)} Days Overdue` : `${days} Days Left`}
                            </div>
                          );
                        })()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {alert.dueDate ? format(new Date(alert.dueDate), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {alert.type === 'USAGE_PENDING' ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={() => handleRecordUsage(alert)}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Record Usage
                      </Button>
                    ) : alert.type === 'INVOICE_PENDING' ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleViewDetails(alert)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={() => handleRecordNextUsage(alert)}
                          disabled={generating === alert.contractId}
                        >
                          {generating === alert.contractId ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Record Usage
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white border-green-200 text-green-600 hover:bg-green-50"
                          onClick={() => handleUpdateUsage(alert)}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Update Reading
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleViewDetails(alert)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Send Invoice
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedContract && (
        <UsageRecordingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingInvoice(null);
          }}
          contractId={selectedContract.contractId}
          customerName={selectedContract.customerName}
          onSuccess={fetchAlerts}
          invoice={editingInvoice}
          defaultMonth={selectedMonth}
          defaultYear={selectedYear}
        />
      )}

      {viewingInvoice && (
        <InvoiceDetailsDialog
          invoice={viewingInvoice}
          onClose={() => {
            setViewingInvoice(null);
            setViewingAlert(null);
          }}
          onApprove={
            viewingAlert?.type === 'INVOICE_PENDING'
              ? () => {
                  handleGenerateInvoice(viewingAlert);
                  setViewingInvoice(null);
                  setViewingAlert(null);
                }
              : undefined
          }
          onApproveNext={
            viewingAlert?.type === 'INVOICE_PENDING'
              ? () => {
                  handleRecordNextUsage(viewingAlert);
                  setViewingInvoice(null);
                  setViewingAlert(null);
                }
              : undefined
          }
          approveLabel="Record Usage"
        />
      )}
    </>
  );
}
