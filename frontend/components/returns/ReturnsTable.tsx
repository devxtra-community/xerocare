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
import {
  Eye,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Wrench,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

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
  const currency = useBranchCurrency();
  const getStatusBadge = (status: string, type: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-muted text-foreground hover:bg-muted shadow-none border-none">
            Draft
          </Badge>
        );
      case 'PENDING_APPROVAL':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-warning/10 text-warning hover:bg-warning/10 shadow-none border-none">
            Pending Finance
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-success/10 text-success hover:bg-success/10 shadow-none border-none">
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-destructive/10 text-destructive hover:bg-destructive/10 shadow-none border-none">
            Rejected
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider bg-primary/10 text-primary hover:bg-primary/10 shadow-none border-none">
            Completed
          </Badge>
        );
      case 'PRODUCT_REPLACED':
        return (
          <Badge
            className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none border-none ${type === 'CREDIT_EXCHANGE' ? 'bg-lease/10 text-lease' : 'bg-success/10 text-success'}`}
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
    <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-border p-4">
      <div className="overflow-x-auto mb-4">
        <Table pagination={{ pageSize: 10 }} className="min-w-[800px] sm:min-w-full">
          <TableHeader className="bg-muted/50">
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
                  className={`${index % 2 ? 'bg-primary/10' : 'bg-card'} hover:bg-muted/50 transition-colors`}
                >
                  <TableCell className="text-primary font-bold tracking-tight">
                    {record.creditNoteNo}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    {record.customerName || '—'}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    {/* For completed exchanges, show new product name; otherwise show returned product */}
                    {record.status === 'PRODUCT_REPLACED' &&
                    record.type === 'CREDIT_EXCHANGE' &&
                    record.replacementProductName ? (
                      <div>
                        <div className="text-xs font-black text-lease leading-tight">
                          {record.replacementProductName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-semibold mt-0.5 line-through">
                          {record.productName}
                        </div>
                      </div>
                    ) : (
                      record.productName
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-foreground">{record.modelName}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                      {record.brand}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider border-primary/30 text-primary bg-primary/10 w-fit"
                      >
                        {record.type.replace('_', ' ')}
                      </Badge>
                      {record.itemCategory === 'SPARE_PART' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-warning bg-warning/10 border border-warning/30 rounded-full px-2 py-0.5 w-fit">
                          <Wrench className="h-2.5 w-2.5" /> Spare Part
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5 w-fit">
                          <Package className="h-2.5 w-2.5" /> Product
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {/* For completed exchanges, show new product amount; for all others show the returned amount */}
                    {record.status === 'PRODUCT_REPLACED' &&
                    record.type === 'CREDIT_EXCHANGE' &&
                    record.replacementAmount ? (
                      <div>
                        <div className="text-sm font-black text-lease">
                          {formatCurrency(record.replacementAmount, currency)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-semibold line-through">
                          {formatCurrency(record.productAmount, currency)}
                        </div>
                      </div>
                    ) : (
                      formatCurrency(record.productAmount, currency)
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
                        className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => onView(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {isSales && record.status === 'DRAFT' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => onEdit?.(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete?.(record)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
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
                            className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                            onClick={() => onApprove?.(record)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                            className="h-8 px-3 gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border-none hover:bg-primary/90 hover:text-primary-foreground transition-colors"
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
