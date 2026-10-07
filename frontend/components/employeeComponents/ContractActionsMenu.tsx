'use client';

import * as React from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ContractAction {
  /** Stable identity for the list. */
  key: string;
  /** Brand mark from BrandMarks — rendered at its natural size. */
  icon: React.ReactNode;
  label: string;
  /** One line saying what the action does, so the menu is readable without tooltips. */
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  /** Swaps the mark for a spinner while the action is in flight. */
  loading?: boolean;
  /**
   * Close the popover when this entry is clicked (default `true`).
   *
   * Closing is right for entries that open a dialog — leaving the popover mounted behind
   * one traps focus. It is wrong for an entry that just fires a request and returns: the
   * popover unmounts, its spinner goes with it, and the user sees nothing happen, which
   * is how the same action ends up clicked twice. Those entries set this to `false` so
   * the in-flight state stays on screen and the entry is disabled until it settles.
   */
  closeOnSelect?: boolean;
}

/**
 * The row's contract actions, behind one button.
 *
 * A rent/lease row can offer up to eight actions depending on where the contract has got
 * to — sign, activate, replace, receipts, advance bill, deposit bill and so on. Rendered
 * inline as icon buttons they pushed the Actions column wider than every other column
 * put together, and each was a bare icon whose meaning lived only in a `title` tooltip.
 *
 * Collapsing them into one popover keeps the column a fixed width no matter how many
 * actions a given row qualifies for, and gives every action a visible text label.
 *
 * Renders nothing when the row has no actions available, rather than an empty menu.
 */
export function ContractActionsMenu({
  actions,
  label = 'Contract Actions',
}: {
  actions: ContractAction[];
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  if (actions.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
          title={label}
          aria-label={label}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        <p className="px-2.5 pt-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <div className="flex flex-col">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled || action.loading}
              onClick={() => {
                if (action.disabled || action.loading) return;
                // Close first: most of these open a dialog of their own, and leaving the
                // popover mounted behind it traps focus between the two. Entries that only
                // fire a request opt out (see closeOnSelect) so their spinner is visible.
                if (action.closeOnSelect !== false) setOpen(false);
                action.onClick();
              }}
              className="flex items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="shrink-0">
                {action.loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  action.icon
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-foreground">
                  {action.label}
                </span>
                {action.description && (
                  <span className="block text-[11px] text-muted-foreground">
                    {action.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
