import React from 'react';

/**
 * Warranty coverage, as a section of the quotation document itself.
 *
 * This used to be rendered by QuotationViewDialog as a sibling AFTER the template
 * component — but each template draws a complete page, letterhead footer and all, so the
 * card landed underneath a finished document, below the red footer stripe. On screen it
 * read as an unrelated widget stuck to the bottom of the dialog, and on paper it belongs
 * to no page at all.
 *
 * It is styled as a plain document section rather than a card: the templates are built
 * from flat type on white, so a rounded, shadowed, amber-tinted panel was the only thing
 * on the page that looked like UI instead of stationery. The heading takes the host
 * template's own accent so the section reads as part of that document, whichever of the
 * nine layouts is rendering it.
 */

export type WarrantyType = 'duration' | 'copies' | 'both' | 'none' | string;

export interface WarrantyInfo {
  warrantyType?: WarrantyType | null;
  warrantyDurationValue?: number | string | null;
  warrantyDurationUnit?: string | null;
  warrantyCopyLimit?: number | string | null;
}

export interface WarrantyDetailsBlockProps extends WarrantyInfo {
  /** The host template's accent colour, so the heading matches its document. */
  accent?: string;
  /** Muted body colour, matching the template's own secondary text. */
  muted?: string;
  /** Primary value colour. Templates on a dark ground (spare parts premium) pass a light
   *  one — a hardcoded near-black would be invisible there. */
  text?: string;
  /** Rule colour under each row, for the same reason. */
  border?: string;
}

/** True when there is a real warranty worth printing a section for. */
export function hasWarranty(w?: WarrantyInfo | null): boolean {
  return !!w?.warrantyType && w.warrantyType !== 'none';
}

const LABELS: Record<string, string> = {
  duration: 'By Duration',
  copies: 'By Count of Copies',
  both: 'By Duration & Count of Copies',
};

export function WarrantyDetailsBlock({
  warrantyType,
  warrantyDurationValue,
  warrantyDurationUnit,
  warrantyCopyLimit,
  accent = '#000000',
  muted = '#555555',
  text = '#111111',
  border = '#eeeeee',
}: WarrantyDetailsBlockProps) {
  if (!hasWarranty({ warrantyType })) return null;

  const showDuration = warrantyType === 'duration' || warrantyType === 'both';
  const showCopies = warrantyType === 'copies' || warrantyType === 'both';

  const row = (label: string, value: React.ReactNode) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '16px',
        padding: '5px 0',
        borderBottom: `1px solid ${border}`,
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: 300, color: muted }}>{label}</span>
      <span style={{ fontSize: '11px', fontWeight: 400, color: text, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );

  return (
    // breakInside keeps the section from being split across two printed pages, which would
    // strand the coverage figures away from the terms that qualify them.
    <div style={{ marginTop: '32px', marginBottom: '24px', breakInside: 'avoid' }}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 300,
          color: accent,
          textTransform: 'uppercase',
          paddingBottom: '5px',
          marginBottom: '12px',
        }}
      >
        Warranty Details
      </div>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 45%', minWidth: 0 }}>
          {row('Warranty Type', (warrantyType && LABELS[warrantyType]) || String(warrantyType))}
          {showDuration &&
            row(
              'Coverage Period',
              `${warrantyDurationValue ?? ''} ${(warrantyDurationUnit ?? '').toString().toUpperCase()}`.trim(),
            )}
          {showCopies &&
            row('Maximum Copy Limit', `${Number(warrantyCopyLimit || 0).toLocaleString()} COPIES`)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: muted, lineHeight: 1.6, fontWeight: 300 }}>
            Technical support and replacement parts are provided free of charge during the warranty
            period specified above. After the warranty period expires, or once the applicable usage
            limit is reached, all technical support services, spare parts, repairs, and related
            charges will be billable at the prevailing rates.
          </div>
        </div>
      </div>
    </div>
  );
}

export default WarrantyDetailsBlock;
