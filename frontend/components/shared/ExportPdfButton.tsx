'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportElementToPdf } from '@/lib/pdfExport';

interface ExportPdfButtonProps {
  /** DOM id of the printable region to capture — the currently-displayed/filtered content. */
  targetId: string;
  reportTitle: string;
  /** Active filter values to show in the PDF header; empty/undefined entries are omitted. */
  filters?: Record<string, string | undefined>;
  branchName?: string;
  filenamePrefix?: string;
  className?: string;
}

/**
 * Universal "Export Page to PDF" button for Accounts pages — reuses the same
 * toPng + jsPDF capture approach as the Tax Invoice PDF via lib/pdfExport, as one
 * shared component rather than a per-page reimplementation.
 */
export function ExportPdfButton({
  targetId,
  reportTitle,
  filters,
  branchName,
  filenamePrefix,
  className,
}: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const element = document.getElementById(targetId);
    if (!element) {
      toast.error('Nothing to export yet');
      return;
    }
    setExporting(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const prefix = (filenamePrefix ?? reportTitle).replace(/[^A-Za-z0-9]+/g, '_');
      await exportElementToPdf(element, `${prefix}_${dateStr}.pdf`, reportTitle, {
        filters,
        branchName,
      });
      toast.success('PDF exported');
    } catch (err) {
      console.error('[ExportPdfButton] export failed', err);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Export PDF
    </Button>
  );
}
