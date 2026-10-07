'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

export interface SearchableNavItem {
  title: string;
  href: string;
  group?: string;
  icon?: LucideIcon;
}

export function SidebarSearch({ items }: { items: SearchableNavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = query.trim()
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.group?.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  const open = useCallback(() => {
    setIsOpen(true);
    setActiveIdx(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIdx(0);
  }, []);

  // Cmd/Ctrl+K to open; Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) close();
        else open();
      }
      if (e.key === 'Escape' && isOpen) close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, open, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIdx]) {
      navigate(results[activeIdx].href);
    }
  };

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  return (
    // Hidden when sidebar collapses to icon-only mode
    <div className="group-data-[collapsible=icon]:hidden relative px-1 pb-1">
      {!isOpen ? (
        <button
          onClick={open}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sidebar-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left text-xs">Quick search...</span>
          <kbd className="hidden sm:inline-flex items-center text-[10px] opacity-40 font-mono tracking-tight">
            ⌘K
          </kbd>
        </button>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Quick search..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={close}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {query.trim() && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-md bg-card border border-border shadow-lg max-h-64 overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="py-1">
                  {results.map((item, i) => (
                    <button
                      // Keyed on position as well as href: two menu entries legitimately
                      // point at one page from time to time (a shortcut in one group and
                      // the canonical entry in another), and keying on href alone turns
                      // that harmless duplication into a React duplicate-key error that
                      // can drop or duplicate results. Order is stable within a render,
                      // so this stays a valid identity for the list.
                      key={`${i}-${item.href}`}
                      onClick={() => navigate(item.href)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors ${
                        i === activeIdx
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{item.title}</div>
                        {item.group && (
                          <div className="text-[10px] text-muted-foreground truncate leading-tight">
                            {item.group}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
