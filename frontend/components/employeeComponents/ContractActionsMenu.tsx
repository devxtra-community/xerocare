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
          className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          title={label}
          aria-label={label}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        <p className="px-2.5 pt-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <div className="flex flex-col">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled || action.loading}
              onClick={() => {
                // Close first: most of these open a dialog of their own, and leaving the
                // popover mounted behind it traps focus between the two.
                setOpen(false);
                action.onClick();
              }}
              className="flex items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="shrink-0">
                {action.loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  action.icon
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-800">
                  {action.label}
                </span>
                {action.description && (
                  <span className="block text-[11px] text-slate-500">{action.description}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
