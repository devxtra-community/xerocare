'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Building2, ChevronDown, X, Download, Calendar, Search, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchBranches, type Branch } from '@/lib/finance/accounts';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface BranchFilterBarProps {
  onExport?: () => void;
  showPeriod?: boolean;
}

const PERIODS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
];

function branchSubtitle(b: Branch): string {
  return [b.country, b.currency].filter(Boolean).join(' · ');
}

export default function BranchFilterBar({ onExport, showPeriod = false }: BranchFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // `selected` mirrors the URL (the applied filter). `draft` is what the user is
  // building while the popover is open — a heavy report page shouldn't refetch on
  // every tap when picking three branches, so the draft is committed on Apply/close.
  const [selected, setSelected] = useState<string[]>(() => {
    const p = searchParams.get('branchIds');
    return p ? p.split(',').filter(Boolean) : [];
  });
  const [draft, setDraft] = useState<string[]>(selected);
  const [period, setPeriod] = useState(() => searchParams.get('period') ?? 'this_year');

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(),
  });

  const pushParams = useCallback(
    (ids: string[], per?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ids.length) {
        params.set('branchIds', ids.join(','));
      } else {
        params.delete('branchIds');
      }
      if (per !== undefined) params.set('period', per);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const ids = searchParams.get('branchIds');
    const next = ids ? ids.split(',').filter(Boolean) : [];
    setSelected(next);
    if (!open) setDraft(next);
    const per = searchParams.get('period');
    if (per) setPeriod(per);
  }, [searchParams, open]);

  const commit = useCallback(
    (ids: string[]) => {
      setSelected(ids);
      // Same set in a different order is not a change worth a refetch.
      const unchanged = ids.length === selected.length && ids.every((id) => selected.includes(id));
      if (!unchanged) pushParams(ids, period);
    },
    [period, pushParams, selected],
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDraft(selected);
      setQuery('');
      // Autofocus search, but only where a physical keyboard is likely — popping the
      // on-screen keyboard on a tablet would cover the list the user came to tap.
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        setTimeout(() => searchRef.current?.focus(), 0);
      }
    } else {
      commit(draft);
    }
  };

  const toggleDraft = (id: string) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) =>
      [b.name, b.country, b.currency].some((f) => (f ?? '').toLowerCase().includes(q)),
    );
  }, [branches, query]);

  const label =
    selected.length === 0
      ? 'All Branches'
      : selected.length === 1
        ? (branches.find((b) => b.id === selected[0])?.name ?? '1 branch')
        : `${selected.length} branches`;

  const selectedBranches = selected
    .map((id) => branches.find((b) => b.id === id))
    .filter((b): b is Branch => Boolean(b));

  const allDraftSelected = draft.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ── Branch picker ─────────────────────────────────────────────── */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`Filter by branch. Currently: ${label}`}
            className={cn(
              'group flex min-h-[44px] max-w-[280px] touch-manipulation items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm shadow-sm transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
              open
                ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100',
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Branch
              </span>
              <span className="max-w-[180px] truncate font-semibold text-slate-800">{label}</span>
            </span>
            {selected.length > 1 && (
              <span className="ml-0.5 shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                {selected.length}
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>
        </PopoverTrigger>

        {/* align="end" keeps the panel inside the viewport — this bar sits flush right
            in most page headers, where a left-aligned panel ran off the screen edge. */}
        <PopoverContent
          align="end"
          sideOffset={6}
          className="z-[9999] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl"
        >
          {/* Search */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-3.5 py-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search branches..."
              aria-label="Search branches"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="flex h-6 w-6 shrink-0 touch-manipulation items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options */}
          <div className="max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain p-1.5">
            <button
              type="button"
              onClick={() => setDraft([])}
              aria-pressed={allDraftSelected}
              className={cn(
                'flex min-h-[44px] w-full touch-manipulation items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                allDraftSelected
                  ? 'bg-blue-50 font-semibold text-blue-700'
                  : 'font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100',
              )}
            >
              <span>All Branches</span>
              {allDraftSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
            </button>

            <div className="my-1.5 border-t border-slate-100" />

            {isLoading ? (
              <div className="space-y-1.5 p-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-400">
                {branches.length === 0 ? 'No branches available.' : `No match for “${query}”.`}
              </p>
            ) : (
              filtered.map((b) => {
                const checked = draft.includes(b.id);
                const subtitle = branchSubtitle(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleDraft(b.id)}
                    className={cn(
                      'flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      checked ? 'bg-blue-50/70' : 'hover:bg-slate-50 active:bg-slate-100',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                        checked
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white',
                      )}
                    >
                      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span
                        className={cn(
                          'truncate text-sm font-semibold',
                          checked ? 'text-blue-800' : 'text-slate-700',
                        )}
                        title={b.name}
                      >
                        {b.name}
                      </span>
                      {subtitle && (
                        <span className="truncate text-[11px] font-medium text-slate-400">
                          {subtitle}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <span className="text-xs font-medium text-slate-500">
              {draft.length === 0 ? 'All branches' : `${draft.length} selected`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDraft([])}
                disabled={draft.length === 0}
                className="min-h-[36px] touch-manipulation rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  commit(draft);
                  setOpen(false);
                }}
                className="min-h-[36px] touch-manipulation rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
              >
                Apply
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* ── Applied selection chips ───────────────────────────────────── */}
      {selectedBranches.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => commit(selected.filter((id) => id !== b.id))}
          aria-label={`Remove ${b.name} filter`}
          className="flex min-h-[32px] max-w-[200px] touch-manipulation items-center gap-1.5 rounded-full bg-blue-100 pl-3 pr-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-200 active:bg-blue-300"
        >
          <span className="truncate" title={b.name}>
            {b.name}
          </span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      ))}

      {selected.length > 1 && (
        <button
          type="button"
          onClick={() => commit([])}
          className="min-h-[32px] touch-manipulation rounded-full px-2.5 text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          Clear all
        </button>
      )}

      {/* ── Period picker ─────────────────────────────────────────────── */}
      {showPeriod && (
        <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 hover:border-slate-300">
          <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              pushParams(selected, e.target.value);
            }}
            aria-label="Reporting period"
            className="cursor-pointer touch-manipulation appearance-none bg-transparent pr-5 font-semibold text-slate-700 outline-none"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none -ml-5 h-4 w-4 shrink-0 text-slate-400" />
        </div>
      )}

      {/* ── Export ────────────────────────────────────────────────────── */}
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="ml-auto flex min-h-[44px] touch-manipulation items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
        >
          <Download className="h-4 w-4 text-slate-400" /> Export All
        </button>
      )}
    </div>
  );
}
