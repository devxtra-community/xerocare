'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRfqs, Rfq, RfqStatus } from '@/lib/rfq';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface RfqTableProps {
  basePath: string;
}

export default function RfqTable({ basePath }: RfqTableProps) {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRfqs();
  }, []);

  const fetchRfqs = async () => {
    try {
      setLoading(true);
      const data = await getRfqs();
      setRfqs(data);
    } catch (error) {
      console.error('Failed to fetch RFQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRfqs = rfqs.filter((rfq) =>
    rfq.rfq_number.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadgeVariant = (status: RfqStatus) => {
    switch (status) {
      case RfqStatus.DRAFT:
        return 'secondary';
      case RfqStatus.SENT:
        return 'default';
      case RfqStatus.PARTIAL_QUOTED:
        return 'destructive';
      case RfqStatus.FULLY_QUOTED:
        return 'outline';
      case RfqStatus.AWARDED:
      case RfqStatus.CLOSED:
        return 'default'; // Or custom colors
      default:
        return 'secondary';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by RFQ number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-10 w-full bg-white border-slate-200 focus-visible:ring-primary shadow-sm rounded-lg"
          />
        </div>

        <Button
          onClick={() => router.push(`${basePath}/rfqs/create`)}
          className="w-full sm:w-auto h-10 shadow-sm transition-all hover:scale-[1.02]"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New RFQ
        </Button>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading RFQs...</div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-slate-600">RFQ Number</TableHead>
                <TableHead className="font-semibold text-slate-600">Date Created</TableHead>
                <TableHead className="font-semibold text-slate-600 text-center">Items</TableHead>
                <TableHead className="font-semibold text-slate-600 text-center">Vendors</TableHead>
                <TableHead className="font-semibold text-slate-600 text-center">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRfqs.length > 0 ? (
                filteredRfqs.map((rfq) => (
                  <TableRow key={rfq.id} className="group hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-900">{rfq.rfq_number}</TableCell>
                    <TableCell className="text-slate-600">
                      {new Date(rfq.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {rfq.items ? rfq.items.length : 0}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {rfq.vendors ? rfq.vendors.length : 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusBadgeVariant(rfq.status)} className="px-2.5 py-0.5">
                        {rfq.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`${basePath}/rfqs/${rfq.id}`)}
                        className="text-slate-600 hover:text-primary transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p>No RFQs found.</p>
                      <Button
                        variant="link"
                        onClick={() => setSearchQuery('')}
                        className="text-primary h-auto p-0"
                      >
                        Clear search filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
