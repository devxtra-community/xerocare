'use client';

import React from 'react';

/**
 * Shared "official document" template — header/logo/branding, footer, totals
 * block, design tokens, and the paginated toPng + jsPDF generation approach.
 * Originally built for the Tax Invoice PDF (TaxDocumentDialog) and extracted
 * here so every generated document in this system (Tax Invoice, Statements,
 * ...) shares one implementation and looks consistent, rather than each
 * being coded per-document.
 */

// ─── Design Tokens ────────────────────────────────────────────────────────────

export const ACCENT = '#000000';
export const TEXT_MUTED = '#555555';
export const TEXT_LIGHT = '#888888';
/** Retained for any consumer that still imports it — now the current wordmark, not the
 *  retired round badge. */
export const LOGO_SRC = '/branding/xerocare-logo.png';

export const watermarkBackground: React.CSSProperties = {
  backgroundImage: `url('/branding/letterhead-watermark.png')`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '78%',
};

export const docStyle: React.CSSProperties = {
  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
  fontSize: 13,
  color: '#1a1a1a',
  background: '#ffffff',
  padding: 0,
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 1040,
  display: 'flex',
  flexDirection: 'column',
  ...watermarkBackground,
};

/** Inset applied to the document body, so the letterhead bands stay full-bleed. */
const bodyInset: React.CSSProperties = { padding: '0 44px' };

export const thStyle = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '10px 10px',
  textAlign: align,
  fontWeight: 300,
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: ACCENT,
  borderTop: `1px solid ${ACCENT}`,
  borderBottom: `1px solid ${ACCENT}`,
});

export const tdStyle = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '12px 10px',
  textAlign: align,
  fontSize: 12,
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
});

// ─── Shared Doc Header ────────────────────────────────────────────────────────

export interface BranchInfo {
  name: string;
  address?: string;
  tax_registration_number?: string;
  country?: string;
  currency?: string;
}

// ─── Xerocare Letterhead ──────────────────────────────────────────────────────
// The bands, logo lock-up and contact strip are the ACTUAL artwork from the company
// letterhead PDF, cropped full-width at 600dpi and dropped in as images. An earlier
// attempt rebuilt them in CSS and never matched — the wordmark, the icon glyphs and
// the angled red flashes on the bottom rule are all bespoke vector art. Because each
// crop spans the full page width, stretching it to 100% reproduces the original
// spacing exactly at any page size.

export const BRAND_RED = '#E3001B';

/** Red band + right-aligned "xerocare Techonology L.L.C" lock-up. */
export const LETTERHEAD_TOP_SRC = '/branding/letterhead-top.png';
/** Contact strip (house / phone / cursor icons) above the black-and-red bottom rule. */
export const LETTERHEAD_FOOTER_SRC = '/branding/letterhead-footer.png';
/** The faded trademark that sits behind the page content. */
export const LETTERHEAD_WATERMARK_SRC = '/branding/letterhead-watermark.png';
/** The logo lock-up on its own, for anywhere that needs just the mark. */
export const XEROCARE_LOGO_SRC = '/branding/xerocare-logo.png';

/** Company contact details, matching the printed letterhead. */
export const COMPANY = {
  name: 'Xerocare Technology L.L.C',
  addressLine1: 'Shams Business Center, Sharjah',
  addressLine2: 'Media City free Zone, Al Messaned, Sharjah, UAE',
  phone1: '+971 6527 0399',
  phone2: '+974 4143 6399',
  email: 'support.ae@xerocare.com',
  website: 'www.xerocare.com',
};

/**
 * Remittance details printed on customer-facing bills, transcribed from the bill the
 * client supplied as the reference layout.
 *
 * Note this names the Qatar trading entity while LetterheadTop's artwork is the UAE one
 * — that split is how their real paperwork reads, so it is reproduced rather than
 * reconciled here. Change both together if the group ever consolidates.
 */
export const BANK = {
  payTo: 'XEROCARE TRADING & SERVICE WLL',
  bank: 'QNB QATAR',
  accountNo: '0251 1998 43001',
  iban: 'QA03 QNBA 0000 0000 0251 1998 43001',
  swift: 'QNBAQAQAXXX',
};

export function LetterheadTop() {
  return (
    <img
      src={LETTERHEAD_TOP_SRC}
      alt="Xerocare Technology L.L.C"
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}

export function LetterheadBottom() {
  return (
    <img
      src={LETTERHEAD_FOOTER_SRC}
      alt=""
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  );
}

/**
 * Background shorthand for the faded centre trademark.
 *
 * Applied as a background rather than an absolutely-positioned element on purpose: an
 * absolute child paints ABOVE the page's static content, which would put the watermark
 * on top of the text. As a background it sits behind everything with no z-index work.
 */

/** Wraps a document in the company letterhead. */
export function Letterhead({
  children,
  minHeight = 1050,
}: {
  children: React.ReactNode;
  minHeight?: number | string;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        ...watermarkBackground,
      }}
    >
      <LetterheadTop />
      <div style={{ flex: 1, padding: '18px 40px 24px 40px' }}>{children}</div>
      <div style={{ marginTop: 'auto' }}>
        <LetterheadBottom />
      </div>
    </div>
  );
}

export function DocHeader({
  branch,
  title,
  subtitle,
}: {
  branch: BranchInfo;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <LetterheadTop />

      <div style={{ ...bodyInset, textAlign: 'center', marginBottom: 28, marginTop: 22 }}>
        {' '}
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: ACCENT,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          ...bodyInset,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 300, color: ACCENT, marginBottom: 6 }}>
            {branch.name}
          </div>
          <div style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>
            {branch.address && <div>{branch.address}</div>}
            {branch.tax_registration_number && <div>TRN: {branch.tax_registration_number}</div>}
            {branch.country && <div>{branch.country}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Shared Doc Footer ────────────────────────────────────────────────────────

export function DocFooter({ branch }: { branch: BranchInfo }) {
  return (
    // marginTop:auto pins the strip to the foot of the sheet (docStyle is a flex column),
    // so a short document does not leave it floating under the last line.
    <div style={{ marginTop: 'auto' }}>
      {branch.address && (
        <div style={{ ...bodyInset, fontSize: 10, color: '#999', paddingBottom: 8 }}>
          {branch.address}
        </div>
      )}
      <LetterheadBottom />
    </div>
  );
}

// ─── Totals Block ─────────────────────────────────────────────────────────────

export function TotalsBlock({
  rows,
}: {
  rows: { label: string; value: string; bold?: boolean }[];
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
      <div style={{ width: 280 }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: row.bold ? `1px solid ${ACCENT}` : '1px solid #f0f0f0',
            }}
          >
            <span
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                color: row.bold ? ACCENT : '#000',
                fontWeight: 300,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: row.bold ? 14 : 12,
                color: row.bold ? ACCENT : '#000',
                fontWeight: 300,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PDF generation — paginated toPng + jsPDF capture of a print element ─────

export async function generateDocPdf(element: HTMLElement) {
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
