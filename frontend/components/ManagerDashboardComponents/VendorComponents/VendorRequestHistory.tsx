'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getVendorRequests } from '@/lib/vendor';
import { format } from 'date-fns';
import { FileText, Loader2, Eye } from 'lucide-react';
// import { Button } from '@/components/ui/button';

interface VendorRequest {
  id: string;
  products: string;
  message?: string;
  created_at: string;
}

/**
 * Component listing history of product requests made to a specific vendor.
 * Displays date, requested products, and messages.
 * Allows viewing full details of past requests.
 */
export default function VendorRequestHistory() {
  const params = useParams();
  const id = params.id as string;
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await getVendorRequests(id);
        if (res.success) {
          setRequests(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch requests', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRequests();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-primary">
        <Loader2 className="animate-spin mr-2" /> Loading history...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-card rounded-xl border border-blue-100/30">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No product requests found.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden h-full flex flex-col border border-blue-100/30">
      <div className="overflow-x-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold text-primary uppercase px-4 py-3">
                Date
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-primary uppercase px-4 py-3">
                Products Requested
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-primary uppercase px-4 py-3">
                Message
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req, index) => (
              <TableRow
                key={req.id}
                className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                  index % 2 ? 'bg-blue-50/20' : 'bg-card'
                }`}
                onClick={() => setSelectedRequest(req)}
              >
                <TableCell className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">
                  {format(new Date(req.created_at), 'dd MMM yyyy, hh:mm a')}
                </TableCell>
                <TableCell
                  className="px-4 py-3 text-xs text-gray-700 max-w-[200px] truncate"
                  title={req.products}
                >
                  {req.products}
                </TableCell>
                <TableCell
                  className="px-4 py-3 text-xs text-gray-500 italic max-w-[150px] truncate"
                  title={req.message || ''}
                >
                  {req.message || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <Eye size={20} /> Request Details
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Date Sent
                  </p>
                  <p className="font-semibold text-foreground">
                    {format(new Date(selectedRequest.created_at), 'PPP p')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Status
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Sent
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Products Requested
                </p>
                <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-sm whitespace-pre-wrap font-mono">
                  {selectedRequest.products}
                </div>
              </div>

              {selectedRequest.message && (
                <div className="space-y-2">
                  <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Additional Message
                  </p>
                  <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100/50 text-sm italic text-foreground">
                    {selectedRequest.message}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
