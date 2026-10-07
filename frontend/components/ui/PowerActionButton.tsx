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
  green: {
    ring: 'from-success via-success to-success',
    glow: 'color-mix(in srgb, var(--success) 45%, transparent)',
  },
  red: {
    ring: 'from-destructive via-destructive to-destructive',
    glow: 'color-mix(in srgb, var(--destructive) 45%, transparent)',
  },
  amber: {
    ring: 'from-warning via-warning to-warning',
    glow: 'color-mix(in srgb, var(--warning) 45%, transparent)',
  },
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
        boxShadow: `0 0 0 1px color-mix(in srgb, var(--foreground) 4%, transparent), 0 2px 6px ${t.glow}`,
      }}
    >
      {/* Dished face: the light gradient runs top-left to bottom-right so the glyph sits
          in a subtle well rather than on a flat white disc. */}
      <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-card to-muted shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--foreground)_12%,transparent)]">
        {loading ? (
          <Loader2 size={Math.round(size * 0.42)} className="animate-spin text-muted-foreground" />
        ) : (
          <Power
            size={Math.round(size * 0.46)}
            strokeWidth={2.4}
            className="text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}
