import * as React from 'react';
import { ACCENT } from './documentTemplate';

/**
 * The house document look, taken from the quotation layouts.
 *
 * The quotations are the reference design: light uppercase headings, 300-weight body
 * text, generous padding and — deliberately — no horizontal rules anywhere. Agreements
 * and bills import these so all three read as one set of paperwork instead of three
 * designs that happen to share a letterhead.
 *
 * Nothing here draws a line. Separation comes from spacing and weight, which is what
 * keeps a page looking like the quotation rather than a spreadsheet.
 */

/** Section title — "BILL TO", "EQUIPMENT", "TERMS & CONDITIONS". */
export function DocSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 300,
        color: ACCENT,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  );
}

/** Small caption above a value in a details grid. */
export function DocFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 300,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
      }}
    >
      {children}
    </div>
  );
}

/** The value under a DocFieldLabel. */
export function DocFieldValue({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: '#1a1a1a' }}>{children}</div>;
}

/** Table header cell — borderless, matching the quotation's thStyle. */
export const docTh = (
  align: 'left' | 'center' | 'right' = 'left',
  color = '#000',
): React.CSSProperties => ({
  padding: '10px 10px',
  textAlign: align,
  fontWeight: 300,
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color,
});

/** Table body cell — borderless, matching the quotation's tdStyle. */
export const docTd = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '12px 10px',
  textAlign: align,
  verticalAlign: 'top',
  fontSize: 12,
});

/** Emphasised total row cell — weight rather than a rule above it. */
export const docTotal = (align: 'left' | 'center' | 'right' = 'right'): React.CSSProperties => ({
  ...docTd(align),
  fontWeight: 600,
  fontSize: 13,
});

/** Body copy inside a section (terms text, notes). */
export const docBody: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 300,
  lineHeight: 1.6,
  color: '#333',
};

/** Spacing between sections — the quotation separates by air, never by a line. */
export const docSectionGap: React.CSSProperties = { marginBottom: 24 };
