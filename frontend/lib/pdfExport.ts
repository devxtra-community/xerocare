'use client';

/**
 * Shared "rasterize a DOM element into a paginated A4 PDF" utility — the same
 * toPng + jsPDF approach already used for the Tax Invoice PDF (TaxDocumentDialog,
 * InvoiceViewDialog), generalized here so every Accounts page can export its
 * currently-displayed/filtered content without a per-page reimplementation.
 */
export async function rasterizeElementToPdf(element: HTMLElement) {
  const { toPng } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

  const TARGET_WIDTH = 900;
  const orig = element.getAttribute('style') || '';
  element.setAttribute(
    'style',
    `${orig}; width:${TARGET_WIDTH}px !important; max-width:${TARGET_WIDTH}px !important; overflow:visible !important;`,
  );
  await new Promise<void>((r) => setTimeout(r, 120));

  let dataUrl: string;
  try {
    dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: TARGET_WIDTH,
    });
  } finally {
    element.setAttribute('style', orig);
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgProps = pdf.getImageProperties(dataUrl);
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const totalH = pdfW * (imgProps.height / imgProps.width);
  let rem = totalH;
  let pos = 0;
  while (rem > 0) {
    pdf.addImage(
      dataUrl,
      'PNG',
      0,
      pos === 0 ? 0 : -(totalH - rem),
      pdfW,
      totalH,
      undefined,
      'FAST',
    );
    rem -= pdfH;
    pos += pdfH;
    if (rem > 0) pdf.addPage();
  }
  return pdf;
}

/**
 * Builds the branch/report header block prepended to every exported Accounts PDF —
 * company logo + name, report title, branch (when scoped to one), active filters, and
 * a generated-at timestamp. Reuses the same logo asset as the Tax Invoice PDF header.
 */
function buildPdfHeader(
  reportTitle: string,
  filters?: Record<string, string | undefined>,
  branchName?: string,
): HTMLDivElement {
  const header = document.createElement('div');
  const filterEntries = Object.entries(filters ?? {}).filter(([, v]) => !!v);
  const filterLine = filterEntries.map(([k, v]) => `${k}: ${v}`).join('   •   ');
  const generatedAt = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  header.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:2px solid #eee;background:#fff;font-family:sans-serif;">
      <div>
        <div style="font-size:26px;font-weight:900;color:#D41B22;letter-spacing:-0.03em;text-transform:lowercase;">xerocare</div>
        <div style="font-size:9px;font-weight:700;color:#AAAAAA;letter-spacing:0.2em;text-transform:uppercase;margin-top:2px;">Trading &amp; Services W.L.L</div>
      </div>
      <img src="/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png" alt="logo" style="width:52px;height:52px;object-fit:contain;" />
      <div style="text-align:right;">
        <div style="font-size:16px;font-weight:800;color:#111;">${reportTitle}</div>
        ${branchName ? `<div style="font-size:11px;color:#666;margin-top:2px;">${branchName}</div>` : ''}
        <div style="font-size:10px;color:#999;margin-top:2px;">Generated: ${generatedAt}</div>
      </div>
    </div>
    ${
      filterLine
        ? `<div style="padding:8px 24px;background:#fafafa;border-bottom:1px solid #eee;font-size:11px;color:#555;font-family:sans-serif;">${filterLine}</div>`
        : ''
    }
  `;
  return header;
}

/**
 * Exports `element`'s current contents to a downloaded PDF, with the shared branch/report
 * header temporarily prepended for the capture only (removed again immediately after).
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  reportTitle: string,
  opts?: { filters?: Record<string, string | undefined>; branchName?: string },
) {
  const header = buildPdfHeader(reportTitle, opts?.filters, opts?.branchName);
  element.insertBefore(header, element.firstChild);
  try {
    const pdf = await rasterizeElementToPdf(element);
    pdf.save(filename);
  } finally {
    header.remove();
  }
}
