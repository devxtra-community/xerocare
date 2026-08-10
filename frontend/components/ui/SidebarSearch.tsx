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
          className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sidebar-accent-foreground/50 hover:text-sidebar-accent-foreground hover:bg-card/10 transition-colors"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left text-xs">Quick search...</span>
          <kbd className="hidden sm:inline-flex items-center text-[10px] opacity-40 font-mono tracking-tight">
            ⌘K
          </kbd>
        </button>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card/15 border border-white/10 focus-within:border-white/30 transition-colors">
            <Search className="h-3.5 w-3.5 shrink-0 text-sidebar-accent-foreground/50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Quick search..."
              className="flex-1 bg-transparent text-xs text-sidebar-accent-foreground placeholder:text-sidebar-accent-foreground/40 outline-none"
            />
            <button
              onClick={close}
              className="text-sidebar-accent-foreground/40 hover:text-sidebar-accent-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {query.trim() && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-md bg-sidebar border border-white/10 shadow-2xl max-h-64 overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-4 py-3 text-xs text-sidebar-accent-foreground/50 text-center">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="py-1">
                  {results.map((item, i) => (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors ${
                        i === activeIdx
                          ? 'bg-card/25 text-sidebar-accent-foreground'
                          : 'text-sidebar-accent-foreground/80 hover:bg-card/15 hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{item.title}</div>
                        {item.group && (
                          <div className="text-[10px] text-sidebar-accent-foreground/40 truncate leading-tight">
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
