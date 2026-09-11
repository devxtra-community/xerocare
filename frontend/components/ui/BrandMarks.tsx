import * as React from 'react';

/**
 * Brand marks for the document-sharing buttons.
 *
 * Drawn as inline SVG rather than loaded as images so they stay crisp at any size, need
 * no network request, and carry no licensing baggage from shipping the official logo
 * files. Each is the recognisable silhouette in the brand's own colour, which is what
 * makes the button scannable at a glance.
 *
 * They are decorative — the button always carries its own visible text label — so both
 * are hidden from assistive technology.
 */

/** Red disc with a white envelope, for "send by email". */
export function GmailMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="12" fill="#E11D2E" />
      {/* Envelope body, inset so the disc reads as a ring around it */}
      <rect x="5" y="7.75" width="14" height="8.5" rx="1.1" fill="#fff" />
      {/* Flap — drawn over the body so the fold reads clearly at 18px */}
      <path
        d="M5.6 8.6 12 13.05 18.4 8.6"
        fill="none"
        stroke="#E11D2E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Green rounded square with the white phone-in-speech-bubble glyph. */
export function WhatsAppMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect width="24" height="24" rx="6" fill="#25D366" />
      <path
        d="M12.03 5.5a6.4 6.4 0 0 0-5.46 9.76l-.7 2.56 2.63-.69a6.4 6.4 0 1 0 3.53-11.63Zm0 1.28a5.12 5.12 0 1 1-2.7 9.46l-.19-.12-1.56.41.42-1.52-.12-.2a5.12 5.12 0 0 1 4.15-8.03Z"
        fill="#fff"
      />
      <path
        d="M9.9 9.02c-.13-.3-.27-.3-.4-.31h-.34a.66.66 0 0 0-.47.22c-.16.18-.62.6-.62 1.47s.63 1.7.72 1.82c.09.12 1.22 1.96 3.02 2.67 1.5.59 1.8.47 2.13.44.32-.03 1.04-.42 1.19-.83.15-.41.15-.76.1-.83-.04-.07-.16-.12-.34-.21-.18-.09-1.04-.51-1.2-.57-.16-.06-.28-.09-.4.09-.11.18-.45.57-.55.69-.1.12-.2.13-.38.04a4.8 4.8 0 0 1-1.41-.87 5.3 5.3 0 0 1-.98-1.21c-.1-.18-.01-.28.08-.37l.27-.32c.09-.1.12-.18.18-.3.06-.12.03-.22-.02-.31-.04-.09-.4-.95-.55-1.3Z"
        fill="#fff"
      />
    </svg>
  );
}

/**
 * Receipt slip — a torn-off till roll with ruled lines and a zigzag tear edge.
 *
 * Used for "generate / view receipt". Deliberately reads as a physical receipt rather
 * than a generic download arrow, so the action is recognisable next to the two share
 * buttons beside it.
 */
export function ReceiptMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {/* Slip body, with the torn bottom edge cut into the same path */}
      <path
        d="M4.5 2.5h15v16.2l-1.9-1.4-1.9 1.4-1.85-1.4-1.85 1.4-1.85-1.4-1.9 1.4-1.9-1.4-1.85 1.4V2.5Z"
        fill="#F5B301"
        stroke="#F5B301"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Ruled lines — two short "item" rows and a longer total rule */}
      <g stroke="#fff" strokeWidth="1.3" strokeLinecap="round">
        <path d="M7.4 6.4h9.2" />
        <path d="M7.4 9.2h9.2" />
        <path d="M7.4 12h5.6" />
      </g>
      {/* Barcode block at the foot, as on the reference slip */}
      <g stroke="#fff" strokeWidth="0.9" strokeLinecap="round">
        <path d="M7.6 15h0.01M9.2 15h0.01M10.8 15h0.01M12.4 15h0.01M14 15h0.01M15.6 15h0.01" />
      </g>
    </svg>
  );
}

/**
 * Contract-action marks, drawn from the reference icons.
 *
 * All four are circular badges in their reference colour so they read as one set in the
 * Contract Actions menu — the colour carries the meaning at a glance (red = still needs
 * signing, green = go/live, blue = money in, green+shield = deposit held).
 */

/** Red disc, document with a pencil — sign the contract agreement. */
export function SignContractMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#D81E20" />
      <path
        d="M7.3 5.8h5.1l2.6 2.6v6.1a1 1 0 0 1-1 1H7.3a1 1 0 0 1-1-1V6.8a1 1 0 0 1 1-1Z"
        fill="#fff"
      />
      <path
        d="M12.4 5.8v2.6H15"
        fill="none"
        stroke="#D81E20"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <g stroke="#D81E20" strokeWidth="0.9" strokeLinecap="round">
        <path d="M8.1 10h4.2M8.1 11.8h4.2M8.1 13.6h2.6" />
      </g>
      {/* Pencil, crossing the lower-right corner as on the reference */}
      <path
        d="m14.1 16.4 4.3-4.3 1.6 1.6-4.3 4.3-2.1.5Z"
        fill="#fff"
        stroke="#D81E20"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Green disc, a contract page with a handshake — activate the contract. */
export function ActivateContractMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#3CC86A" />
      {/* Contract page */}
      <rect x="6.8" y="4.6" width="10.4" height="8" rx="1" fill="#fff" />
      <g stroke="#3CC86A" strokeWidth="1" strokeLinecap="round">
        <path d="M8.7 6.8h6.6M8.7 8.8h6.6M8.7 10.8h4" />
      </g>
      {/* Handshake — two blocky cuffs meeting at a clasped centre, legible at 20px */}
      <path d="M3.8 16.2 7 14.4l2.4 1.4-1.3 2.4-3.1-1.8a.9.9 0 0 1-.3-1.2Z" fill="#fff" />
      <path d="M20.2 16.2 17 14.4l-2.4 1.4 1.3 2.4 3.1-1.8a.9.9 0 0 0 .3-1.2Z" fill="#fff" />
      <path
        d="M9 15.6c1-.7 1.9-.7 2.9 0l1 .7c.5.4 1.2.4 1.7 0l.4-.3"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Blue disc, a coin dropping into a wallet — advance payment receipts, deposits collected. */
export function AdvancePaymentMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#2C4F9E" />
      {/* Coin first, so the wallet's top edge overlaps it and the coin reads as going IN.
          It sits off to the left on purpose: a centred glyph above a wide symmetric shape
          reads as a face at 20px, which is exactly what the cupped-palm drawing did. */}
      <circle cx="8.4" cy="6.5" r="3.3" fill="#FACC15" />
      <rect x="4.2" y="9.3" width="15.6" height="9.4" rx="2.2" fill="#fff" />
      {/* Card pocket on the right edge with its stud — the detail that makes the white
          rounded rect a wallet rather than a plain card. */}
      <path d="M13.5 12.6h6.3v3.4h-6.3a1.7 1.7 0 0 1 0-3.4Z" fill="#2C4F9E" />
      <circle cx="15.3" cy="14.3" r="0.85" fill="#fff" />
    </svg>
  );
}

/** Green disc, banknote behind a shield — advance & security deposit bills. */
export function SecurityBillMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#22C55E" />
      <rect x="4.4" y="7" width="11.2" height="6.6" rx="0.9" fill="#fff" />
      <circle cx="10" cy="10.3" r="1.7" fill="#22C55E" />
      {/* Shield, overlapping the note's lower-right as on the reference */}
      <path
        d="M15.4 11.4l3.9 1.3v2.6c0 1.9-1.6 3.3-3.9 4.1-2.3-.8-3.9-2.2-3.9-4.1v-2.6Z"
        fill="#FACC15"
        stroke="#fff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <circle cx="15.4" cy="14.9" r="0.85" fill="#fff" />
      <path d="M15.4 15.4v1.5" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/** Slate disc with a paper plane — send a draft on to Finance. */
export function SendMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#64748B" />
      <path
        d="M18.4 6.2 5.9 11.1c-.5.2-.5.8 0 1l3.1 1.1 6.8-4.3-5.4 5 .3 3.6c.1.5.7.6 1 .2l1.6-2 3.1 2.3c.4.3.9.1 1-.4l1.6-10.8c.1-.5-.3-.8-.6-.6Z"
        fill="#fff"
      />
    </svg>
  );
}

/** Amber disc with a clipboard and a gauge needle — submit the period's meter reading. */
export function MeterReadingMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#F59E0B" />
      <rect x="6.4" y="5.6" width="11.2" height="13" rx="1.2" fill="#fff" />
      <rect x="9.4" y="4.2" width="5.2" height="2.8" rx="0.8" fill="#F59E0B" />
      {/* Gauge: a dial arc with a needle, so it reads as a meter not a plain checklist */}
      <path
        d="M8.8 14.4a3.2 3.2 0 0 1 6.4 0"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M12 14.4l2.1-2" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="12" cy="14.5" r="0.8" fill="#F59E0B" />
    </svg>
  );
}

/** Indigo disc with a wrench — raise or view the installation request. */
export function InstallationMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#4F46E5" />
      {/* Spanner: open jaw at the top-left, shaft running to the lower-right */}
      <path
        d="M15.6 5.4a4.2 4.2 0 0 0-4.9 5.3L5.3 16.1a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a4.2 4.2 0 0 0 5.3-4.9l-2.3 2.3-2.1-.6-.6-2.1 2.3-2.3Z"
        fill="#fff"
      />
    </svg>
  );
}

/** Indigo disc with a plain document — open the contract this job belongs to. */
export function ContractDocMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#6366F1" />
      <path
        d="M7.6 5.4h5.3l3.5 3.5v9.1a.9.9 0 0 1-.9.9H7.6a.9.9 0 0 1-.9-.9V6.3a.9.9 0 0 1 .9-.9Z"
        fill="#fff"
      />
      <path
        d="M12.9 5.4v3.5h3.5"
        fill="none"
        stroke="#6366F1"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <g stroke="#6366F1" strokeWidth="1.05" strokeLinecap="round">
        <path d="M9.2 11.4h5.6M9.2 13.6h5.6M9.2 15.8h3.4" />
      </g>
    </svg>
  );
}

/**
 * Indigo disc with two stacked bills — the periodic bills raised against one contract.
 *
 * Deliberately a *stack*, not the single page [[ContractDocMark]] uses: the action opens
 * every bill raised on the contract, and a lone page is already spoken for as "the
 * contract document". The front page carries a currency mark so it reads as a bill
 * rather than as any old paperwork.
 */
export function BillsMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#6366F1" />
      {/* Back page, peeking out top-right — the only cue that there is more than one.
          It carries a white edge because flat indigo-on-indigo closes up below ~24px. */}
      <path
        d="M10.6 4.3h5l3.1 3.1v8.2a.8.8 0 0 1-.8.8h-1.5V8.7L13.2 5h-2.6Z"
        fill="#C7D2FE"
        stroke="#fff"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Front page */}
      <path
        d="M6.1 6.7h5.6l3.4 3.4v8.5a.9.9 0 0 1-.9.9H6.1a.9.9 0 0 1-.9-.9V7.6a.9.9 0 0 1 .9-.9Z"
        fill="#fff"
      />
      <path
        d="M11.7 6.7v3.4h3.4"
        fill="none"
        stroke="#6366F1"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <g stroke="#6366F1" strokeWidth="1.1" strokeLinecap="round">
        <path d="M7.4 12.3h5.5M7.4 14.4h5.5M7.4 16.5h3" />
      </g>
      {/* A gold coin instead of a drawn currency glyph: at 20px a coin still reads as
          money, where the strokes of a ₹ or $ close up into a smudge. */}
      <circle cx="15.4" cy="16.6" r="3.1" fill="#FACC15" stroke="#fff" strokeWidth="0.9" />
    </svg>
  );
}

/** Slate disc with an eye — look at the machine currently on this job. */
export function ViewProductMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#64748B" />
      <path
        d="M4.6 12s3-5 7.4-5 7.4 5 7.4 5-3 5-7.4 5-7.4-5-7.4-5Z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.2" fill="#fff" />
    </svg>
  );
}

/** Orange disc with two circling arrows — swap the machine on this job. */
export function MachineSwapMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#F97316" />
      <path
        d="M6.4 10.2a5.8 5.8 0 0 1 9.5-2.1"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M17.6 13.8a5.8 5.8 0 0 1-9.5 2.1"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M16.4 5.4v2.9h-2.9M7.6 18.6v-2.9h2.9"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Violet disc with a ticked clipboard — the signed installation report. */
export function ReportMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#8B5CF6" />
      <rect x="6.4" y="5.6" width="11.2" height="13" rx="1.2" fill="#fff" />
      <rect x="9.4" y="4.2" width="5.2" height="2.8" rx="0.8" fill="#8B5CF6" />
      <path
        d="m9.1 12.4 2.1 2.2 4-4.3"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
