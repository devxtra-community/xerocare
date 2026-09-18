import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';

/**
 * The printed payment receipt for Sale, Rent and Lease collections.
 *
 * One generator serves all three — a SalePaymentRequest carries a `paymentContext` of
 * SALE / RENT_ADVANCE / RENT_PERIODIC / LEASE_ADVANCE / LEASE_PERIODIC (and the deposit
 * variants), so the layout here is what every customer receives whatever they paid for.
 *
 * It used to be bare Helvetica on an A5 page: no letterhead, no seal, no signature, and —
 * most importantly — no record of WHO took the money. The receipt is the customer's only
 * proof of payment and the company's only counterfoil, so the person who physically
 * received the cash has to be named on it; `recordedByEmployeeName` was already stored and
 * simply never printed. Approval is a separate, internal act and is shown as such.
 *
 * Drawn on the same letterhead artwork the quotations use, so a customer holding a
 * quotation and a receipt sees one company rather than two.
 */

/**
 * A5 in points.
 *
 * A receipt carries a handful of rows, so on A4 it filled the top third and left the rest
 * blank — a page that reads as having failed to finish printing. A5 is the size receipts
 * are normally issued at, the letterhead artwork scales to any width, and two fit on one
 * A4 sheet if they are printed in bulk.
 */
export const PAGE = { width: 419.53, height: 595.28 };

const COLORS = {
  ink: '#111111',
  muted: '#666666',
  faint: '#999999',
  rule: '#e2e2e2',
  accent: '#E3001B',
};

/**
 * Asset lookup that works from both `src` (ts-node in dev) and `dist` (compiled), since
 * `tsc` does not copy non-TS files. Missing artwork must never fail a receipt — the
 * customer needs the numbers far more than the letterhead — so callers get null and draw
 * a text fallback instead.
 */
function assetPath(file: string): string | null {
  const candidates = [
    path.resolve(__dirname, '../../assets', file),
    path.resolve(__dirname, '../../../assets', file),
    path.resolve(process.cwd(), 'assets', file),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  logger.warn(`Receipt asset not found: ${file} — falling back to text-only letterhead.`);
  return null;
}

export interface ReceiptField {
  label: string;
  value: string;
  /** Renders larger and in the accent colour — used for the amount. */
  emphasis?: boolean;
}

export interface ReceiptDocumentInput {
  /** "PAYMENT RECEIPT", or "SECURITY DEPOSIT RECEIPT" for a refundable deposit. */
  title: string;
  /** SPAY-YYYY-NNNN */
  receiptNo: string;
  /** SALE / RENT / LEASE, shown as a chip beside the title. */
  contextLabel?: string;
  customerName: string;
  /** The detail rows, already formatted for printing. */
  fields: ReceiptField[];
  amountInWords?: string;
  /** Who physically took the money. */
  collectedByName: string;
  collectedOn?: string;
  /** Who signed it off in Accounts. Absent while a request is still pending. */
  approvedByName?: string;
  approvedOn?: string;
  /** Printed under the rule at the foot of the body. */
  note?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = any; // PDFKit is imported dynamically by the callers; its types are not bundled.

/** Full-bleed letterhead band, returning the y coordinate the body may start at. */
function drawHeader(doc: Doc): number {
  const top = assetPath('letterhead-top.png');
  if (top) {
    // Width is the whole page: the artwork is designed edge to edge, and insetting it by
    // the page margin leaves white slivers down both sides of the red bar.
    doc.image(top, 0, 0, { width: PAGE.width });
    return 78;
  }
  doc.fontSize(16).fillColor(COLORS.accent).font('Helvetica-Bold');
  doc.text('XEROCARE', 50, 40);
  return 92;
}

/** Footer artwork, pinned to the bottom of the page rather than to the flow. */
function drawFooter(doc: Doc) {
  const foot = assetPath('letterhead-footer.png');
  if (!foot) return;
  // Match the artwork's aspect ratio (2480x368) so the stripe is never squashed.
  const h = PAGE.width * (368 / 2480);
  doc.image(foot, 0, PAGE.height - h, { width: PAGE.width });
}

/**
 * Renders the whole receipt onto an open PDFKit document.
 *
 * The caller owns the document lifecycle (`doc.end()`, buffering, upload) because the two
 * call sites differ: one streams a response, the other uploads for a notification link.
 */
export function renderReceipt(doc: Doc, input: ReceiptDocumentInput) {
  const L = 40; // left margin
  const R = PAGE.width - 40; // right edge
  const innerW = R - L;

  let y = drawHeader(doc);

  // ─── Title ────────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.ink);
  doc.text(input.title.toUpperCase(), L, y, { width: innerW, align: 'center' });
  y = doc.y + 4;

  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
  const sub = input.contextLabel
    ? `${input.receiptNo}   ·   ${input.contextLabel}`
    : input.receiptNo;
  doc.text(sub, L, y, { width: innerW, align: 'center' });
  y = doc.y + 14;

  doc.moveTo(L, y).lineTo(R, y).lineWidth(1).strokeColor(COLORS.rule).stroke();
  y += 18;

  // ─── Received from ────────────────────────────────────────────────────────
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.faint);
  doc.text('RECEIVED WITH THANKS FROM', L, y);
  y = doc.y + 2;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink);
  doc.text(input.customerName, L, y, { width: innerW });
  y = doc.y + 16;

  // ─── Detail rows ──────────────────────────────────────────────────────────
  // A fixed label column keeps every value left-aligned on the same axis. The old
  // receipt used `continued: true`, which let a long customer name push its value onto
  // the next line and knocked the whole column out of alignment.
  const LABEL_W = 108;
  for (const f of input.fields) {
    if (!f.value) continue;
    const valueW = innerW - LABEL_W;
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted);
    doc.text(f.label, L, y + (f.emphasis ? 3 : 0), { width: LABEL_W });

    if (f.emphasis) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.accent);
    } else {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.ink);
    }
    doc.text(f.value, L + LABEL_W, y, { width: valueW });

    y = Math.max(doc.y, y + (f.emphasis ? 20 : 14)) + 4;
    doc
      .moveTo(L, y - 3)
      .lineTo(R, y - 3)
      .lineWidth(0.5)
      .strokeColor('#f0f0f0')
      .stroke();
  }

  if (input.amountInWords) {
    y += 4;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.faint);
    doc.text('AMOUNT IN WORDS', L, y);
    y = doc.y + 1;
    doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(COLORS.ink);
    doc.text(input.amountInWords, L, y, { width: innerW });
    y = doc.y + 14;
  }

  // ─── Accountability: collected vs approved ────────────────────────────────
  // Two distinct acts by two different people. Collapsing them (the old receipt printed
  // only "Approved by") hid the one fact a receipt exists to record: who took the money.
  y += 8;
  doc.moveTo(L, y).lineTo(R, y).lineWidth(1).strokeColor(COLORS.rule).stroke();
  y += 14;

  const colW = innerW / 2;
  const pair = (x: number, heading: string, name: string, on?: string) => {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.faint);
    doc.text(heading, x, y, { width: colW - 12 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink);
    doc.text(name || '—', x, doc.y + 1, { width: colW - 12 });
    if (on) {
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted);
      doc.text(on, x, doc.y + 1, { width: colW - 12 });
    }
  };

  const startY = y;
  pair(L, 'COLLECTED BY', input.collectedByName, input.collectedOn);
  const leftEnd = doc.y;
  y = startY;
  pair(
    L + colW,
    'APPROVED BY (ACCOUNTS)',
    input.approvedByName || 'Pending approval',
    input.approvedOn,
  );
  y = Math.max(leftEnd, doc.y) + 26;

  // ─── Signature & seal ─────────────────────────────────────────────────────
  // Pinned toward the foot of the page rather than left to follow the fields. A receipt
  // carries few rows, so a flowing signature block floated up the sheet and left a third
  // of the page blank beneath it — which reads as a document that failed to finish
  // printing. `Math.max` keeps the flow honest: a payment with many rows (a cheque, or a
  // card with holder and approval ref) pushes the block down instead of colliding with it.
  const FOOTER_H = PAGE.width * (368 / 2480);
  y = Math.max(y, PAGE.height - FOOTER_H - 150);

  const seal = assetPath('seal.png');
  const sigX = R - 150;
  if (seal) {
    // Sits above and left of the rule, the way a rubber stamp lands over a signature.
    doc.image(seal, sigX + 12, y - 4, { width: 68 });
  }
  const sigLineY = y + 62;
  doc.moveTo(sigX, sigLineY).lineTo(R, sigLineY).lineWidth(0.8).strokeColor('#bbbbbb').stroke();
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted);
  doc.text('Authorised Signature & Seal', sigX, sigLineY + 5, {
    width: R - sigX,
    align: 'center',
  });

  // Customer's counter-signature, opposite the company's.
  doc
    .moveTo(L, sigLineY)
    .lineTo(L + 140, sigLineY)
    .lineWidth(0.8)
    .strokeColor('#bbbbbb')
    .stroke();
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted);
  doc.text("Receiver's Signature", L, sigLineY + 5, { width: 140, align: 'center' });

  // ─── Closing note ─────────────────────────────────────────────────────────
  if (input.note) {
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.faint);
    doc.text(input.note, L, sigLineY + 34, { width: innerW, align: 'center' });
  }

  drawFooter(doc);
}
