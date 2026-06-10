'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2, Send, CheckCircle2, XCircle, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';

import { CreditNoteRecord } from '@/lib/invoice';

interface Props {
  data: CreditNoteRecord[];
  role: string;
  onView: (record: CreditNoteRecord) => void;
  onEdit?: (record: CreditNoteRecord) => void;
  onDelete?: (record: CreditNoteRecord) => void;
  onSend?: (record: CreditNoteRecord) => void;
  onApprove?: (record: CreditNoteRecord) => void;
  onReject?: (record: CreditNoteRecord) => void;
  onComplete?: (record: CreditNoteRecord) => void;
}

export default function ReturnsTable({
  data,
  role,
  onView,
  onEdit,
  onDelete,
  onSend,
  onApprove,
  onReject,
  onComplete,
}: Props) {
  const getStatusBadge = (status: string, type: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-slate-100 text-slate-600 hover:bg-slate-100 shadow-none border-none">
            Draft
          </Badge>
        );
      case 'PENDING_APPROVAL':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-amber-100 text-amber-700 hover:bg-amber-100 shadow-none border-none">
            Pending Finance
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-none">
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-none">
            Rejected
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-blue-100 text-blue-700 hover:bg-blue-100 shadow-none border-none">
            Completed
          </Badge>
        );
      case 'PRODUCT_REPLACED':
        return (
          <Badge
            className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none border-none ${type === 'CREDIT_EXCHANGE' ? 'bg-violet-100 text-violet-700' : 'bg-green-100 text-green-700'}`}
          >
            {type === 'CREDIT_EXCHANGE' ? 'Exchange Realized' : 'Replacement Realized'}
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider">
            {status}
          </Badge>
        );
    }
  };

  const isSales = role === 'EMPLOYEE' || role === 'MANAGER';
  const isFinance = role === 'FINANCE' || role === 'ADMIN';

  return (
    <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100 p-4">
      <div className="overflow-x-auto mb-4">
        <Table className="min-w-[800px] sm:min-w-full">
          <TableHeader className="bg-muted/50/50">
            <TableRow>
              <TableHead className="text-primary font-bold">CREDIT NOTE #</TableHead>
              <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
              <TableHead className="text-primary font-bold">PRODUCT</TableHead>
              <TableHead className="text-primary font-bold">MODEL / BRAND</TableHead>
              <TableHead className="text-primary font-bold">RETURN TYPE</TableHead>
              <TableHead className="text-primary font-bold">AMOUNT</TableHead>
              <TableHead className="text-primary font-bold">DATE</TableHead>
              <TableHead className="text-primary font-bold text-center">STATUS</TableHead>
              <TableHead className="text-primary font-bold text-center">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No return records found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((record, index) => (
                <TableRow
                  key={record.id}
                  className={`${index % 2 ? 'bg-blue-50/10' : 'bg-card'} hover:bg-muted/50 transition-colors`}
                >
                  <TableCell className="text-blue-500 font-bold tracking-tight">
                    {record.creditNoteNo}
                  </TableCell>
                  <TableCell className="font-bold text-slate-700">
                    {record.customerName || '—'}
                  </TableCell>
                  <TableCell className="font-bold text-slate-700">
                    {/* For completed exchanges, show new product name; otherwise show returned product */}
                    {record.status === 'PRODUCT_REPLACED' &&
                    record.type === 'CREDIT_EXCHANGE' &&
                    record.replacementProductName ? (
                      <div>
                        <div className="text-xs font-black text-violet-700 leading-tight">
                          {record.replacementProductName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5 line-through">
                          {record.productName}
                        </div>
                      </div>
                    ) : (
                      record.productName
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-slate-700">{record.modelName}</div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">
                      {record.brand}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider border-blue-200 text-blue-600 bg-blue-50"
                    >
                      {record.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {/* For completed exchanges, show new product amount; for all others show the returned amount */}
                    {record.status === 'PRODUCT_REPLACED' &&
                    record.type === 'CREDIT_EXCHANGE' &&
                    record.replacementAmount ? (
                      <div>
                        <div className="text-sm font-black text-violet-700">
                          {formatCurrency(record.replacementAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold line-through">
                          {formatCurrency(record.productAmount)}
                        </div>
                      </div>
                    ) : (
                      formatCurrency(record.productAmount)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-medium">
                    {record.createdAt ? format(new Date(record.createdAt), 'dd MMM yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(record.status, record.type)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => onView(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {isSales && record.status === 'DRAFT' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => onEdit?.(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onDelete?.(record)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50"
                            onClick={() => onSend?.(record)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {isFinance && record.status === 'PENDING_APPROVAL' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50"
                            onClick={() => onApprove?.(record)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onReject?.(record)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {isSales &&
                        record.status === 'APPROVED' &&
                        (record.type === 'REPLACEMENT' || record.type === 'CREDIT_EXCHANGE') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border-none hover:bg-blue-600 hover:text-white transition-colors"
                            onClick={() => onComplete?.(record)}
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Complete
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
