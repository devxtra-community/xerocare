import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface PostingPreviewProps {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoice: any;
}

export default function PostingPreview({ type, invoice }: PostingPreviewProps) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-4 text-center text-muted-foreground">
        Posting Preview Placeholder for {type} - {invoice?.invoiceNumber}
      </CardContent>
    </Card>
  );
}
