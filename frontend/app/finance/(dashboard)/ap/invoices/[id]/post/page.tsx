'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { arInvoices } from '@/lib/finance/ar';

import PageHeader from '@/components/Finance/pageHeader';
// import PostingPreview from '@/components/Finance/PostingPreview';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ARPostPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const invoice = arInvoices.find((inv) => inv.id === id);
  if (!invoice) notFound();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Post Invoice to General Ledger"
        description={`Preview GL impact for ${invoice.invoiceNumber}`}
      />

      {/* <PostingPreview type="AP_INVOICE" invoice={invoice} /> */}
      <div className="p-4 border border-dashed rounded text-center text-muted-foreground">
        Posting Preview Component is missing.
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invoice
        </Button>

        <Button disabled className="bg-emerald-600 text-white">
          Confirm & Post
        </Button>
      </div>
    </div>
  );
}
