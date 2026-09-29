'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Semantic tone of an icon-only table action.
 *
 * The visual language lives in globals.css (`.action-icon*`): every tone is neutral at
 * rest and takes its colour on hover, so a row of actions reads as one calm instrument
 * rather than a strip of coloured buttons. The tone decides the hover/focus colour and
 * the focus ring — the glyph and the tooltip carry the meaning everywhere else.
 */
export type ActionTone = 'neutral' | 'success' | 'destructive' | 'info' | 'warning';

const TONE_CLASS: Record<ActionTone, string> = {
  neutral: 'action-icon',
  success: 'action-icon action-icon-success',
  destructive: 'action-icon action-icon-destructive',
  info: 'action-icon action-icon-info',
  warning: 'action-icon action-icon-warning',
};

export interface ActionIconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** Accessible name — also the tooltip text. Required: an icon without a name is a guess. */
  label: string;
  /** The 14px lucide glyph (or any svg) rendered inside the button. */
  children: React.ReactNode;
  tone?: ActionTone;
  /** Swaps the glyph for a spinner and disables the button while its request runs. */
  loading?: boolean;
  /** Hides the button entirely when the action is not available (vs. merely disabled). */
  hidden?: boolean;
}

/**
 * The one icon-only action button every ERP table uses.
 *
 * Icon-only controls need a name for everyone: sighted users get a tooltip on hover
 * AND keyboard focus (Radix handles both), assistive technology gets the aria-label.
 * 30×30px with a 14px glyph keeps a five-action row inside one table column.
 */
export function ActionIconButton({
  label,
  children,
  tone = 'neutral',
  loading = false,
  hidden = false,
  className,
  disabled,
  type = 'button',
  ...props
}: ActionIconButtonProps) {
  if (hidden) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type={type}
            aria-label={label}
            aria-busy={loading || undefined}
            disabled={disabled || loading}
            className={cn(TONE_CLASS[tone], className)}
            {...props}
          >
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px] font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * A row of table actions in one container.
 *
 * Same 6px rhythm everywhere, wraps instead of overflowing on narrow screens, and gives
 * the action column one consistent width profile across every ERP table that uses it.
 */
export function ActionGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('action-group', className)} {...props} />;
}
