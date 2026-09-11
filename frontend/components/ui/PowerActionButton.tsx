'use client';

import * as React from 'react';
import { Loader2, Power } from 'lucide-react';

/**
 * Round power button that starts an installation job.
 *
 * A bright ring around a pale dished face with the standard power glyph — the same
 * affordance as a physical power switch, which is exactly what "start this job" is. The
 * ring carries the colour and the state; the face stays light so the glyph reads at the
 * ~36px a table row allows.
 *
 * Icon-only by design, so it needs an accessible name: `label` becomes both the tooltip
 * and the aria-label.
 */
const TONES = {
  green: { ring: 'from-green-400 via-green-500 to-green-600', glow: 'rgba(34,197,94,0.45)' },
  red: { ring: 'from-rose-400 via-red-500 to-red-600', glow: 'rgba(239,68,68,0.45)' },
  amber: { ring: 'from-amber-300 via-amber-400 to-amber-500', glow: 'rgba(245,158,11,0.45)' },
} as const;

export function PowerActionButton({
  label,
  tone = 'green',
  size = 36,
  loading = false,
  disabled = false,
  onClick,
}: {
  label: string;
  tone?: keyof typeof TONES;
  size?: number;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const t = TONES[tone];
  const ring = Math.max(3, Math.round(size * 0.11));
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      aria-label={label}
      className={[
        'relative inline-flex items-center justify-center rounded-full',
        'bg-gradient-to-br',
        t.ring,
        'transition-all active:translate-y-px',
        'disabled:opacity-60 disabled:pointer-events-none',
      ].join(' ')}
      style={{
        width: size,
        height: size,
        padding: ring,
        // Outer glow plus a grounding shadow — what separates a lit ring from a flat circle.
        boxShadow: `0 0 0 1px rgba(0,0,0,0.04), 0 2px 6px ${t.glow}`,
      }}
    >
      {/* Dished face: the light gradient runs top-left to bottom-right so the glyph sits
          in a subtle well rather than on a flat white disc. */}
      <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-white to-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
        {loading ? (
          <Loader2 size={Math.round(size * 0.42)} className="animate-spin text-slate-500" />
        ) : (
          <Power
            size={Math.round(size * 0.46)}
            strokeWidth={2.4}
            className="text-slate-500"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}
