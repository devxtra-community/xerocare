'use client';

import * as React from 'react';
import { Building2, Check, ChevronDown, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getBranches, type Branch } from '@/lib/branch';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const ALL_BRANCHES = 'all';

interface BranchSelectorProps {
  /** Selected branch id, or ALL_BRANCHES for the organisation-wide view. */
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/**
 * Organisation-wide / single-branch picker.
 *
 * Controlled on purpose — the dashboard keeps the choice in the URL (`?branchId`)
 * so a filtered view stays shareable and survives a refresh.
 */
export function BranchSelector({ value, onValueChange, className }: BranchSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
    staleTime: 600_000,
  });

  // Only active branches are selectable — an inactive branch has no live figures
  // to show, but a value already in the URL is kept so a shared link never
  // silently falls back to "All Branches".
  const branches: Branch[] = React.useMemo(() => {
    const list: Branch[] = data?.data ?? [];
    return list.filter((b) => b.status === 'ACTIVE' || b.id === value);
  }, [data, value]);

  const selected = branches.find((b) => b.id === value);
  const label = value === ALL_BRANCHES ? 'All Branches' : (selected?.name ?? 'All Branches');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) =>
      [b.name, b.location, b.country_code, b.currency_code].some((f) =>
        (f ?? '').toLowerCase().includes(q),
      ),
    );
  }, [branches, query]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery('');
      // Skip autofocus on touch devices — the on-screen keyboard would cover the
      // list the user opened the menu to tap.
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        setTimeout(() => searchRef.current?.focus(), 0);
      }
    }
  };

  const select = (next: string) => {
    onValueChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`Filter by branch. Currently: ${label}`}
          className={cn(
            'flex h-8 min-w-[150px] max-w-[220px] touch-manipulation items-center gap-2 rounded-md border px-2.5 text-[11px] font-medium transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
            open
              ? 'border-primary/40 bg-muted/60'
              : 'border-muted-foreground/20 bg-background hover:bg-muted/50',
            className,
          )}
        >
          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left" title={label}>
            {label}
          </span>
          {value !== ALL_BRANCHES && selected?.currency_code && (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              {selected.currency_code}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={4}
        className="z-[9999] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl p-0 shadow-xl"
      >
        <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search branches..."
            aria-label="Search branches"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-5 w-5 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain p-1.5">
          <button
            type="button"
            onClick={() => select(ALL_BRANCHES)}
            className={cn(
              'flex min-h-[40px] w-full touch-manipulation items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
              value === ALL_BRANCHES
                ? 'bg-primary/10 font-semibold text-primary'
                : 'font-medium hover:bg-muted active:bg-muted/80',
            )}
          >
            <span className="flex flex-col leading-tight">
              <span>All Branches</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                Combined, each in its own currency
              </span>
            </span>
            {value === ALL_BRANCHES && <Check className="h-3.5 w-3.5 shrink-0" />}
          </button>

          <div className="my-1.5 border-t" />

          {isLoading ? (
            <div className="space-y-1.5 p-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">
              {branches.length === 0 ? 'No branches available.' : `No match for “${query}”.`}
            </p>
          ) : (
            filtered.map((b) => {
              const active = b.id === value;
              const subtitle = [b.location, b.currency_code].filter(Boolean).join(' · ');
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => select(b.id)}
                  className={cn(
                    'flex min-h-[40px] w-full touch-manipulation items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                    active ? 'bg-primary/10' : 'hover:bg-muted active:bg-muted/80',
                  )}
                >
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span
                      className={cn('truncate text-xs font-semibold', active && 'text-primary')}
                      title={b.name}
                    >
                      {b.name}
                    </span>
                    {subtitle && (
                      <span className="truncate text-[10px] font-medium text-muted-foreground">
                        {subtitle}
                      </span>
                    )}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
