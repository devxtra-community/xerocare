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
import { getCollectionAlerts, CollectionAlert, generateMonthlyInvoice } from '@/lib/invoice';
import { Loader2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import UsageRecordingModal from './UsageRecordingModal';
import { format, differenceInDays } from 'date-fns';

export default function MonthlyCollectionTable({ mode }: { mode?: 'RENT' | 'LEASE' }) {
  const [alerts, setAlerts] = useState<CollectionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<CollectionAlert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await getCollectionAlerts();
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
  }, []);

  const handleRecordUsage = (alert: CollectionAlert) => {
    setSelectedContract(alert);
    setIsModalOpen(true);
  };

  const handleGenerateInvoice = async (alert: CollectionAlert) => {
    setGenerating(alert.contractId);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of month

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

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No pending collections for this month.</p>
      </div>
    );
  }

  return (
    <>
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
            {alerts.map((alert) => (
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
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                      Invoice Pending
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
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleGenerateInvoice(alert)}
                      disabled={generating === alert.contractId}
                    >
                      {generating === alert.contractId ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      Generate Invoice
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedContract && (
        <UsageRecordingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          contractId={selectedContract.contractId}
          customerName={selectedContract.customerName}
          onSuccess={fetchAlerts}
        />
      )}
    </>
  );
}
